export type SiteConfig = {
  name: string;
  url: string;
  minTextChars: number;
  minHtmlBytes: number;
  minDomElements: number;
  baselineMinRatio: number;
};

export type CheckStatus =
  | "UP"
  | "HTTP_ERROR"
  | "CONTENT_ERROR"
  | "TIMEOUT"
  | "BLOCKED"
  | "BROWSER_ERROR";

export type CheckResult = {
  site: string;
  url: string;
  status: CheckStatus;
  checkedAt: number;
  httpStatus: number | null;
  loadMs: number;
  title: string;
  textLength: number;
  htmlBytes: number;
  domElements: number;
  contentHash: string;
};

export type Baseline = {
  textLength: number;
  htmlBytes: number;
};
