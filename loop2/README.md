# Steel Rates MCP Server

A tiny custom MCP server for Kamran Steel Works' estimation loop. It has
**one tool**, `get_material_rate`, which fetches current rates from
[mwpbnp.com/pricing](https://mwpbnp.com/pricing/) and returns the lines
that match whatever material you ask about.

This is a learning project for Loop Engineering (Concept 10: Connectors) —
built so a real loop can look up a rate instead of guessing one.

## 1. Install

```bash
cd steel-rates-mcp
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

If `pip install mcp[cli]` fails or `from mcp.server.fastmcp import FastMCP`
errors on your machine, run `pip show mcp` to check the version. This
project was written against the standard MCP Python SDK (the one with a
`server.fastmcp` module). If your installed version differs, run
`pip install --upgrade "mcp[cli]"` and try again.

## 2. Test it standalone first (no Claude Code needed)

Before wiring it into Claude Code, prove the scraper itself works:

```bash
python3 server.py "MS pipe"
```

You should see one or more lines from the live pricing page that mention
"MS pipe" and a rupee figure. If you get "No rate line matched", the
site's exact wording is different from what you searched — try a
shorter or different keyword (e.g. just "pipe", or "GI sheet").

**Read the output critically.** This is exactly the checker habit from
the book: don't trust the first result blindly. Compare what it found to
what you know the real rate roughly is.

## 3. Register it with Claude Code

Add this to your Claude Code MCP config (run `claude mcp add` or edit
the config file directly — check `claude mcp --help` for your version):

```bash
claude mcp add steel-rates -- python3 /full/path/to/steel-rates-mcp/server.py
```

Then in a Claude Code session:

```
what's the current MS pipe rate?
```

Claude should call the `get_material_rate` tool and show you the live
result, instead of guessing a number from its training data.

## 4. Known limitations (be upfront about these in class)

- **Fragile scraping.** This reads the page's visible text, not a real
  API. If mwpbnp.com redesigns their page, the matching may stop working
  and will need a small update to `_find_rate_lines` in `server.py`.
- **One website only.** It does not compare multiple sources or
  cross-check prices.
- **No caching.** Every call re-fetches the page. For a real loop, add a
  simple "only refetch if last check was over N hours ago" rule so you
  are not hammering the site on every run.
- **Not a replacement for your own rate file.** Treat this as a
  *reference check*, not the final number — your local dealer's actual
  quoted rate is still the authority, exactly as discussed in the
  estimation procedure.

## Next step

Once this works standalone, the loop prompt (the `/goal` command) can
call it directly, e.g.: *"First call get_material_rate for each material
in the order, then draft the estimate using those rates."*
