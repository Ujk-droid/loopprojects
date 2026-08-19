import fs from "fs";
import path from "path";
import { Estimate, formatRs } from "@/lib/format";

const REPO_ROOT = path.join(process.cwd(), "..");
export const DRAFTS_DIR = path.join(REPO_ROOT, "drafts");
export const APPROVED_DIR = path.join(REPO_ROOT, "approved");
export const ORDERS_DIR = path.join(REPO_ROOT, "practice-orders");

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export type { Estimate };

function parseMoney(text: string, regex: RegExp): number | null {
  const m = text.match(regex);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ""));
}

function parseSourceHeader(orderRelPath: string): { sender: string | null; subject: string | null } {
  const abs = path.join(REPO_ROOT, orderRelPath);
  if (!fs.existsSync(abs)) return { sender: null, subject: null };
  const text = fs.readFileSync(abs, "utf-8");
  const senderMatch = text.match(/^From:\s*(.+)$/m);
  const subjectMatch = text.match(/^Subject:\s*(.+)$/m);
  return {
    sender: senderMatch ? senderMatch[1].trim() : null,
    subject: subjectMatch ? subjectMatch[1].trim() : null,
  };
}

export function parseDraft(id: string, content: string): Estimate {
  const titleMatch = content.match(/^#\s*.*Estimate for\s+(\S+)\s*(?:\(([^)]+)\))?/m);
  const sourceFile = titleMatch ? titleMatch[1] : `practice-orders/${id}.txt`;
  const orderType = titleMatch && titleMatch[2] ? titleMatch[2] : id;

  const materialSubtotal = parseMoney(
    content,
    /\*\*MATERIAL SUBTOTAL\*\*\s*\|\s*\|\s*\|\s*\*\*Rs\s*([\d,]+\.?\d*)\*\*/
  );
  const labourCost = parseMoney(content, /\*\*Labour cost\*\*\s*\|\s*\*\*Rs\s*([\d,]+\.?\d*)\*\*/);
  const electricity = parseMoney(content, /Electricity\s*\|\s*\*\*Rs\s*([\d,]+\.?\d*)\*\*/);

  let subtotalBeforeProfit: number | null = null;
  const sectionMatch = content.match(/##\s*4\.\s*Subtotal before profit([\s\S]*?)(?:\n##|$)/);
  if (sectionMatch) {
    const m = sectionMatch[1].match(/\*\*Rs\s*([\d,]+\.?\d*)\*\*/);
    if (m) subtotalBeforeProfit = parseFloat(m[1].replace(/,/g, ""));
  }

  const assumptionsCount = (content.match(/⚠️\s*\*\*ASSUMPTION\*\*/g) || []).length;
  const awaitingProfit = /AWAITING OWNER-SET PROFIT/.test(content);

  const { sender, subject } = parseSourceHeader(sourceFile);

  return {
    id,
    orderType,
    sourceFile,
    sender,
    subject,
    materialSubtotal,
    labourCost,
    electricity,
    subtotalBeforeProfit,
    assumptionsCount,
    awaitingProfit,
  };
}

export function listDrafts(): Estimate[] {
  if (!fs.existsSync(DRAFTS_DIR)) return [];
  return fs
    .readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith("-draft.md"))
    .map((f) => {
      const id = f.slice(0, -"-draft.md".length);
      const content = fs.readFileSync(path.join(DRAFTS_DIR, f), "utf-8");
      return parseDraft(id, content);
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function finalizeDraft(id: string, profitPercent: number) {
  if (!isValidId(id)) throw new Error("Invalid id");
  const draftPath = path.join(DRAFTS_DIR, `${id}-draft.md`);
  if (!fs.existsSync(draftPath)) throw new Error("Draft not found");

  let content = fs.readFileSync(draftPath, "utf-8");
  const estimate = parseDraft(id, content);
  if (estimate.subtotalBeforeProfit == null) {
    throw new Error("Could not determine subtotal before profit from draft");
  }

  const subtotal = estimate.subtotalBeforeProfit;
  const profit = subtotal * (profitPercent / 100);
  const final = subtotal + profit;
  const today = new Date().toISOString().slice(0, 10);

  content = content.replace(/\n?AWAITING OWNER-SET PROFIT % to finalize\.\s*$/, "");
  content = content.replace(
    /^Draft — not yet reviewed\/approved\.$/m,
    `Reviewed and approved ${today} via dashboard.`
  );

  content += `

## 5. Profit (owner-set)

Owner-confirmed rate for this order: **${profitPercent}% of subtotal**
Profit = ${formatRs(subtotal)} × ${(profitPercent / 100).toFixed(4)} = **${formatRs(profit)}**

## 6. Final total

**${formatRs(final)}**
`;

  if (!fs.existsSync(APPROVED_DIR)) fs.mkdirSync(APPROVED_DIR, { recursive: true });
  const approvedPath = path.join(APPROVED_DIR, `${id}-estimate.md`);
  fs.writeFileSync(approvedPath, content, "utf-8");
  fs.unlinkSync(draftPath);

  return { subtotal, profit, final };
}
