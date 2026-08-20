// リポジトリ層。GitHub GraphQL API との通信とページネーションを担当し、生データを返す。
// ドメイン変換は core が行う。

import { request } from "graphql-request";
import {
  addIssueCommentMutation,
  closeIssueMutation,
  projectItemsQuery,
  projectStatusQuery,
  updateItemStatusMutation,
} from "./graphql";
import { paginate } from "./paginate";

export interface GitHubRepository {
  token: string;
  userAgent: string;
}

export interface ProjectRef {
  org: string;
  number: number;
}

export interface FetchPageOptions {
  project: ProjectRef;
  pageSize?: number;
  cursor?: string | null;
}

export interface IteratePageOptions {
  project: ProjectRef;
  pageSize?: number;
}

export interface UpdateItemStatusOptions {
  projectId: string;
  itemId: string;
  fieldId: string;
  optionId: string;
}

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const PAGE_SIZE = 50;

export const createGitHubGraphQL = (repository: GitHubRepository) => {
  const requestHeaders = {
    Authorization: `Bearer ${repository.token}`,
    "User-Agent": repository.userAgent,
  };

  const fetchPage = async function (options: FetchPageOptions) {
    const data = await request({
      url: GRAPHQL_ENDPOINT,
      document: projectItemsQuery,
      variables: {
        org: options.project.org,
        number: options.project.number,
        pageSize: options.pageSize ?? PAGE_SIZE,
        cursor: options.cursor ?? null,
      },
      requestHeaders,
    });
    const items = data.organization?.projectV2?.items;
    if (!items) {
      throw new Error(
        `Unexpected response: no projectV2.items for ${options.project.org}/projects/${options.project.number}`,
      );
    }
    return items;
  };

  /** Project の全アイテムを返す。ページネーションはここで吸収し、ページをまたいで逐次 yield する */
  const iterateProjectItems = async function* (options: IteratePageOptions) {
    const pages = paginate(async (cursor) => {
      const page = await fetchPage({ ...options, cursor });
      return [page, page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null];
    });
    for await (const page of pages) {
      for (const node of page.nodes ?? []) {
        if (node) yield node;
      }
    }
  };

  /** project id と Status フィールドを生のまま返す */
  const fetchProjectStatus = async (project: ProjectRef) => {
    const data = await request({
      url: GRAPHQL_ENDPOINT,
      document: projectStatusQuery,
      variables: { org: project.org, number: project.number },
      requestHeaders,
    });
    const projectV2 = data.organization?.projectV2;
    if (!projectV2) {
      throw new Error(`Unexpected response: no projectV2 for ${project.org}/projects/${project.number}`);
    }
    return projectV2;
  };

  /** Status フィールドの id・選択肢と project id を返す (fetchProjectStatus の narrowing 済み版) */
  const fetchStatusField = async (project: ProjectRef) => {
    const projectV2 = await fetchProjectStatus(project);
    const field = projectV2.field;
    if (!field || !("options" in field)) {
      throw new Error(`Status field not found in ${project.org}/projects/${project.number}`);
    }
    return { projectId: projectV2.id, fieldId: field.id, options: field.options };
  };

  const updateItemStatus = async (options: UpdateItemStatusOptions) => {
    await request({
      url: GRAPHQL_ENDPOINT,
      document: updateItemStatusMutation,
      variables: options,
      requestHeaders,
    });
  };

  const closeIssue = async (issueId: string) => {
    await request({
      url: GRAPHQL_ENDPOINT,
      document: closeIssueMutation,
      variables: { issueId },
      requestHeaders,
    });
  };

  const addIssueComment = async (issueId: string, body: string) => {
    await request({
      url: GRAPHQL_ENDPOINT,
      document: addIssueCommentMutation,
      variables: { issueId, body },
      requestHeaders,
    });
  };

  return {
    fetchPage,
    iterateProjectItems,
    fetchProjectStatus,
    fetchStatusField,
    updateItemStatus,
    closeIssue,
    addIssueComment,
  };
};
