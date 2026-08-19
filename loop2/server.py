"""
Steel Rates MCP Server
-----------------------
A small custom MCP server that fetches current steel/iron material rates
from a Pakistani pricing website (mwpbnp.com/pricing) and exposes them as
an MCP tool that Claude Code (or any MCP client) can call.

This is intentionally simple: one tool, one website, plain-text scraping.
It is meant as a learning project (Loop Engineering, Concept 10: Connectors)
and a real, practical building block for Kamran Steel Works' estimation loop.

Run it directly to test:
    python3 server.py

Or register it with Claude Code (see README.md).
"""

import os
import re
import sys
from datetime import date
from typing import Optional

import requests
from bs4 import BeautifulSoup
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("steel-rates")

PRICING_URL = "https://mwpbnp.com/pricing/"
PROGRESS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "progress.md")

# A generous set of headers so the site treats us like a normal browser,
# not a bot. Some pricing sites block plain scripts.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}


def _fetch_page() -> str:
    """Download the pricing page. Raises on network failure."""
    resp = requests.get(PRICING_URL, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return resp.text


# The site (as of 2026-08) doesn't have a single "MS pipe" row of text --
# each product is its own block: an <h3 class="product-title"> name (e.g.
# "Pipe Hard/ Scaffolding"), a "Category: Mild Steel Iron" meta line, a
# unit badge, and a price table. "MS pipe" is really several of these
# blocks (Hard/Scaffolding, Prime-Rassa, Prime Round, ...) that all share
# the "Mild Steel Iron" category rather than the word "MS" in their title.
# So matching has to look at title + category together, and common trade
# abbreviations (MS, GI, SS) need expanding to what the site actually says.
_KEYWORD_ALIASES = {
    "ms": "mild steel",
    "gi": "galvanized",
    "ss": "stainless steel",
}


def _parse_products(html: str) -> list[dict]:
    """
    Parse the pricing page into one dict per product block:
    {"title", "category", "unit", "rows": [(size, {column_header: price})]}.
    Reads only the desktop <table>, since the page also renders a
    duplicate mobile "stack view" of the same data.
    """
    soup = BeautifulSoup(html, "html.parser")
    products = []
    for block in soup.find_all("div", class_="mwp-front-product-block"):
        title_tag = block.find("h3", class_="product-title")
        if not title_tag:
            continue
        title = re.sub(r"^\d+\.\s*", "", title_tag.get_text(strip=True))

        meta_tag = block.find("div", class_="mwp-front-product-meta")
        category = meta_tag.get_text(strip=True).removeprefix("Category:").strip() if meta_tag else ""

        unit_tag = block.find("span", class_="mwp-front-unit-badge")
        unit = unit_tag.get_text(strip=True).removeprefix("Unit:").strip() if unit_tag else ""

        rows = []
        table = block.select_one(".mwp-front-table-wrap table.mwp-front-table")
        if table:
            headers = [th.get_text(strip=True) for th in table.select("thead th")][1:]
            for tr in table.select("tbody tr"):
                cells = tr.find_all("td")
                if not cells:
                    continue
                size = cells[0].get_text(strip=True)
                prices = {
                    header: price
                    for header, cell in zip(headers, cells[1:])
                    if (price := cell.get_text(strip=True)) and price != "—"
                }
                if prices:
                    rows.append((size, prices))

        products.append({"title": title, "category": category, "unit": unit, "rows": rows})
    return products


def _normalize_size(text: str) -> str:
    # Strip both inch marks (") and foot marks (') -- sizes on the site use
    # both, e.g. bar/pipe sizes in inches (1/2") and sheet sizes in feet (8').
    return re.sub(r"[\s'\"]", "", text).lower()


def _size_parts(normalized: str) -> tuple[str, ...]:
    return tuple(p for p in normalized.split("x") if p)


def _size_row_matches(row_size: str, dim_token: str) -> bool:
    # Compare individual dimension components ("2x2" -> ("2","2")), not raw
    # substrings -- "2x2" is a true substring of "1-1/2x2" ("...1/2x2"),
    # which would otherwise wrongly match a 1-1/2" x 2" row.
    row_parts = _size_parts(_normalize_size(row_size))
    dim_parts = _size_parts(dim_token)
    if len(dim_parts) == 1:
        return dim_parts[0] in row_parts
    return sorted(dim_parts) == sorted(row_parts)


def _split_keyword_tokens(keyword: str) -> tuple[list[str], list[str]]:
    """
    Split a keyword into descriptive tokens (match product title/category,
    e.g. "square", "pipe") and dimension tokens (match a row's size column,
    e.g. "2x2", "1-1/2x1-1/2"). A token counts as a dimension if it
    contains a digit -- product names never do.
    """
    descriptive, dimensions = [], []
    for token in keyword.split():
        (dimensions if re.search(r"\d", token) else descriptive).append(
            _normalize_size(token) if re.search(r"\d", token) else token
        )
    return descriptive, dimensions


def _product_matches(product: dict, tokens: list[str]) -> bool:
    # Match on the literal token OR its alias -- some products spell out
    # the abbreviation in their title/category (e.g. "GI Sheets"), others
    # only spell out the full word (e.g. "CGI Sheets" -> "Galvanized Iron").
    # Leading word-boundary, not a plain substring: a raw "in" check lets
    # short abbreviations like "ss" false-match inside ordinary words (Pipe
    # Prime-Rassa, Brass). No trailing boundary, so plurals still match
    # ("sheet" -> "Sheets").
    haystack = f"{product['title']} {product['category']}".lower()
    for token in tokens:
        token = token.lower()
        alias = _KEYWORD_ALIASES.get(token)
        candidates = [token] + ([alias] if alias else [])
        if not any(re.search(rf"\b{re.escape(c)}", haystack) for c in candidates):
            return False
    return True


def _find_rate_lines(html: str, keyword: str) -> list[str]:
    products = _parse_products(html)
    descriptive, dimensions = _split_keyword_tokens(keyword)
    matches = [p for p in products if _product_matches(p, descriptive)]

    lines = []
    for product in matches:
        rows = product["rows"]
        # A dimension token (e.g. "2x2") pins down the exact size row --
        # without this, a product with many sizes (like re-rolled square/
        # rectangle pipe, which has 18 rows) can push the size you actually
        # asked for past the line cap below before you ever see it.
        if dimensions:
            rows = [
                (size, prices)
                for size, prices in rows
                if all(_size_row_matches(size, dim) for dim in dimensions)
            ]
        for size, prices in rows:
            price_text = ", ".join(f"{header}: {price}" for header, price in prices.items())
            lines.append(f"{product['title']} ({product['unit']}) — {size}: {price_text}")
    return lines[:8]  # cap it -- we only need a few matching lines


@mcp.tool()
def get_material_rate(material_keyword: str) -> str:
    """
    Fetch the current rate for a steel/iron material from mwpbnp.com/pricing.

    Args:
        material_keyword: what to search for, e.g. "MS pipe", "GI sheet",
            "square bar", "deformed bar". Use short, simple terms --
            the site's own wording (in English) matches best.

    Returns:
        The matching line(s) of text from the live pricing page, or a
        clear message if nothing matched (so the caller knows to fall
        back to the estimator's own saved rate file instead of guessing).
    """
    try:
        html = _fetch_page()
    except requests.RequestException as exc:
        return (
            f"Could not reach {PRICING_URL}: {exc}. "
            "Fall back to the local rates.txt file instead of guessing."
        )

    matches = _find_rate_lines(html, material_keyword)
    if not matches:
        return (
            f"No rate line matched '{material_keyword}' on {PRICING_URL} today. "
            "The site's wording may differ, or the page layout changed. "
            "Fall back to the local rates.txt file instead of guessing."
        )

    header = f"Rates matching '{material_keyword}' from {PRICING_URL} (just fetched):\n"
    return header + "\n".join(f"- {line}" for line in matches)


_RATE_LINE_RE = re.compile(r"^(?P<title>.+?) \(.+?\) — (?P<size>.+?): (?P<rest>.+)$")
# First "label: Rs n,nnn" pair in `rest`. Matched separately from the price
# itself (rather than splitting `rest` on ",") because the price's own
# thousands separator ("Rs 1,790") is indistinguishable from the comma that
# separates one gauge/price pair from the next.
_FIRST_PRICE_RE = re.compile(r"Rs\.?\s?[\d,]+")


def _rate_payload(rate_result: str) -> str:
    """
    Reduce a get_material_rate() result to one simple, loggable line: the
    first matching product/size and its first price only -- not every
    gauge/column for every matched size. e.g.
        "Pipe Hard/ Scaffolding — 1-7/8\": Rs 1,790"
    On a "no match" / "could not reach" result there's nothing to simplify;
    that message is already a single line, so it's used as-is.
    """
    lines = rate_result.splitlines()
    if not lines or not lines[0].startswith("Rates matching") or len(lines) < 2:
        return rate_result.strip()

    first = lines[1].removeprefix("- ")
    match = _RATE_LINE_RE.match(first)
    if not match:
        return first  # unexpected format -- log it verbatim rather than fail

    title, size, rest = match.group("title"), match.group("size"), match.group("rest")
    price_match = _FIRST_PRICE_RE.search(rest)
    price = price_match.group(0).rstrip(", ") if price_match else rest
    return f"{title} — {size}: {price}"


def _read_log_entries() -> list[tuple[str, str, str]]:
    """Parse progress.md's '- date | keyword | rate' lines into tuples."""
    if not os.path.exists(PROGRESS_FILE):
        return []
    entries = []
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line.startswith("- "):
                continue
            parts = line[2:].split(" | ", 2)
            if len(parts) == 3:
                entries.append(tuple(parts))
    return entries


def _last_logged_rate(entries: list[tuple[str, str, str]], keyword: str) -> Optional[str]:
    keyword_norm = keyword.strip().lower()
    for _date, kw, rate in reversed(entries):
        if kw.strip().lower() == keyword_norm:
            return rate
    return None


@mcp.tool()
def check_and_log_rate(material_keyword: str) -> str:
    """
    Fetch the current rate for material_keyword (via get_material_rate),
    compare it to the most recent progress.md entry logged for that exact
    keyword, and append a new dated line only if the rate is new or has
    changed since then.

    Args:
        material_keyword: same keyword you'd pass to get_material_rate,
            e.g. "MS pipe". Matching against past log entries is by exact
            keyword text (case-insensitive) -- log with a consistent
            keyword to track a material over time.

    Returns:
        A short message saying whether a new line was logged (new material
        or changed rate) or the rate was unchanged and already logged.
    """
    rate_result = get_material_rate(material_keyword)
    payload = _rate_payload(rate_result)

    entries = _read_log_entries()
    previous = _last_logged_rate(entries, material_keyword)

    if previous == payload:
        return f"'{material_keyword}': unchanged, already logged."

    today = date.today().isoformat()
    with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
        f.write(f"- {today} | {material_keyword} | {payload}\n")

    verb = "Updated" if previous is not None else "New"
    return f"'{material_keyword}': {verb} rate logged to progress.md ({today})."


if __name__ == "__main__":
    # Quick manual test without going through an MCP client at all:
    #   python3 server.py "MS pipe"
    if len(sys.argv) > 1:
        print(get_material_rate(" ".join(sys.argv[1:])))
    else:
        # Normal MCP server mode (stdio) -- this is what Claude Code will use.
        mcp.run()
