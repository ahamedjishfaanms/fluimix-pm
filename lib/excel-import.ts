import * as XLSX from "xlsx";

export const PROJECT_HEADERS = [
  "Type",
  "Key",
  "Name",
  "Parent Key",
  "Description",
  "Status",
  "Due Date",
  "Color",
] as const;

export const TASK_HEADERS = [
  "Project Key",
  "Title",
  "Description",
  "Status",
  "Priority",
  "Due Date",
  "Assignee Email",
] as const;

export function downloadImportTemplate() {
  const wb = XLSX.utils.book_new();

  const instructions = [
    ["Fluimix PM — bulk import template"],
    [""],
    ["How to use this file:"],
    ["1. Fill in the 'Projects' sheet first — one row per project or sub-project."],
    ["2. Fill in the 'Tasks' sheet — one row per task, referencing a Project Key."],
    ["3. Save the file, then go to Projects → Import from Excel in the app and upload it."],
    [""],
    ["Projects sheet columns:"],
    ["  Type          — 'Main' or 'Sub'. Leave blank and it's inferred from Parent Key."],
    ["  Key           — short unique code, e.g. PMR. Required."],
    ["  Name          — full project name. Required."],
    ["  Parent Key    — only for sub-projects: the Key of its parent project."],
    ["  Description   — optional, free text."],
    ["  Status        — active / on_hold / completed / archived. Default: active."],
    ["  Due Date      — optional, format YYYY-MM-DD."],
    ["  Color         — optional hex code, e.g. #153a67."],
    [""],
    ["Tasks sheet columns:"],
    ["  Project Key      — must match a Key from the Projects sheet (or an existing project already in the app). Required."],
    ["  Title            — required."],
    ["  Description      — optional."],
    ["  Status           — backlog / todo / in_progress / in_review / done. Default: todo."],
    ["  Priority         — low / medium / high / urgent. Default: medium."],
    ["  Due Date         — optional, format YYYY-MM-DD."],
    ["  Assignee Email   — optional, must be an @fluimix.com address that has already signed up."],
    [""],
    ["Tip: keep the header row exactly as-is — don't rename or remove columns."],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, instructionsSheet, "Instructions");

  const projectRows = [
    PROJECT_HEADERS as unknown as string[],
    ["Main", "PMR", "Power Mix Rollout", "", "Company-wide rollout of the new power mix additive line.", "active", "2026-12-31", "#153a67"],
    ["Sub", "PMR-QA", "Quality Assurance", "PMR", "QA workstream for the rollout.", "active", "2026-10-15", "#c9932a"],
  ];
  const projectSheet = XLSX.utils.aoa_to_sheet(projectRows);
  projectSheet["!cols"] = PROJECT_HEADERS.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, projectSheet, "Projects");

  const taskRows = [
    TASK_HEADERS as unknown as string[],
    ["PMR", "Calibrate flow sensor batch 3", "Recheck calibration before shipping.", "todo", "high", "2026-08-20", "you@fluimix.com"],
    ["PMR-QA", "Draft QA checklist", "", "backlog", "medium", "", ""],
  ];
  const taskSheet = XLSX.utils.aoa_to_sheet(taskRows);
  taskSheet["!cols"] = TASK_HEADERS.map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, taskSheet, "Tasks");

  XLSX.writeFile(wb, "fluimix-pm-import-template.xlsx");
}

export interface ParsedProjectRow {
  type: "main" | "sub";
  key: string;
  name: string;
  parentKey: string | null;
  description: string | null;
  status: string;
  dueDate: string | null;
  color: string | null;
  rowNumber: number;
}

export interface ParsedTaskRow {
  projectKey: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeEmail: string | null;
  rowNumber: number;
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function excelDateToISO(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${parsed.y}-${mm}-${dd}`;
  }
  const s = String(value).trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsedDate = new Date(s);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }
  return null;
}

export async function parseImportFile(file: File): Promise<{
  projects: ParsedProjectRow[];
  tasks: ParsedTaskRow[];
  errors: string[];
}> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });

  const errors: string[] = [];

  const projectSheetName = wb.SheetNames.find((n) => normalizeHeader(n) === "projects") || wb.SheetNames[0];
  const taskSheetName = wb.SheetNames.find((n) => normalizeHeader(n) === "tasks") || wb.SheetNames[1];

  const projects: ParsedProjectRow[] = [];
  if (projectSheetName) {
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[projectSheetName], { defval: "" });
    rows.forEach((row, i) => {
      const rowNumber = i + 2;
      const map: Record<string, unknown> = {};
      Object.entries(row).forEach(([k, v]) => (map[normalizeHeader(k)] = v));

      const key = String(map["key"] || "").trim().toUpperCase();
      const name = String(map["name"] || "").trim();
      if (!key && !name) return; // skip fully blank rows

      if (!key) {
        errors.push(`Projects row ${rowNumber}: missing Key.`);
        return;
      }
      if (!name) {
        errors.push(`Projects row ${rowNumber}: missing Name.`);
        return;
      }

      const parentKey = String(map["parent key"] || "").trim().toUpperCase() || null;
      const typeRaw = String(map["type"] || "").trim().toLowerCase();
      const type: "main" | "sub" = typeRaw === "sub" || (!typeRaw && parentKey) ? "sub" : "main";

      const status = (String(map["status"] || "active").trim().toLowerCase() || "active") as string;
      const validStatuses = ["active", "on_hold", "completed", "archived"];

      projects.push({
        type,
        key,
        name,
        parentKey: type === "sub" ? parentKey : null,
        description: String(map["description"] || "").trim() || null,
        status: validStatuses.includes(status) ? status : "active",
        dueDate: excelDateToISO(map["due date"]),
        color: String(map["color"] || "").trim() || null,
        rowNumber,
      });
    });
  }

  const tasks: ParsedTaskRow[] = [];
  if (taskSheetName) {
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[taskSheetName], { defval: "" });
    rows.forEach((row, i) => {
      const rowNumber = i + 2;
      const map: Record<string, unknown> = {};
      Object.entries(row).forEach(([k, v]) => (map[normalizeHeader(k)] = v));

      const projectKey = String(map["project key"] || "").trim().toUpperCase();
      const title = String(map["title"] || "").trim();
      if (!projectKey && !title) return;

      if (!projectKey) {
        errors.push(`Tasks row ${rowNumber}: missing Project Key.`);
        return;
      }
      if (!title) {
        errors.push(`Tasks row ${rowNumber}: missing Title.`);
        return;
      }

      const status = String(map["status"] || "todo").trim().toLowerCase();
      const validStatuses = ["backlog", "todo", "in_progress", "in_review", "done"];
      const priority = String(map["priority"] || "medium").trim().toLowerCase();
      const validPriorities = ["low", "medium", "high", "urgent"];

      tasks.push({
        projectKey,
        title,
        description: String(map["description"] || "").trim() || null,
        status: validStatuses.includes(status) ? status : "todo",
        priority: validPriorities.includes(priority) ? priority : "medium",
        dueDate: excelDateToISO(map["due date"]),
        assigneeEmail: String(map["assignee email"] || "").trim().toLowerCase() || null,
        rowNumber,
      });
    });
  }

  return { projects, tasks, errors };
}
