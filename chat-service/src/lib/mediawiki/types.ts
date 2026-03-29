export interface MWUserInfo {
  id: number;
  name: string;
  anon?: boolean;
}

export interface MWPageContent {
  title: string;
  revisionId: number;
  wikitext: string;
}
