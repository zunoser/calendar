// リポジトリ層。GitHub GraphQL API との通信とページネーションを担当し、生データを返す。
// ドメイン変換は core が行う。

import { request } from "graphql-request";
import { closeIssueMutation, issueFieldsQuery, issuesQuery, setIssueFieldValueMutation } from "./graphql";
import { paginate } from "./paginate";

export interface GitHubRepository {
  token: string;
  userAgent: string;
}

export interface RepositoryRef {
  owner: string;
  name: string;
}

export interface FetchPageOptions {
  repository: RepositoryRef;
  pageSize?: number;
  cursor?: string | null;
}

export interface IteratePageOptions {
  repository: RepositoryRef;
  pageSize?: number;
}

export interface SetIssueStatusOptions {
  issueId: string;
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
      document: issuesQuery,
      variables: {
        owner: options.repository.owner,
        name: options.repository.name,
        pageSize: options.pageSize ?? PAGE_SIZE,
        cursor: options.cursor ?? null,
      },
      requestHeaders,
    });
    const issues = data.repository?.issues;
    if (!issues) {
      throw new Error(
        `Unexpected response: no repository.issues for ${options.repository.owner}/${options.repository.name}`,
      );
    }
    return issues;
  };

  /** リポジトリの全 Issue を返す。ページネーションはここで吸収し、ページをまたいで逐次 yield する */
  const iterateIssues = async function* (options: IteratePageOptions) {
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

  /** リポジトリの Issue Field (single select のみ) を生のまま返す */
  const fetchIssueFields = async (repo: RepositoryRef) => {
    const data = await request({
      url: GRAPHQL_ENDPOINT,
      document: issueFieldsQuery,
      variables: { owner: repo.owner, name: repo.name },
      requestHeaders,
    });
    const issueFields = data.repository?.issueFields;
    if (!issueFields) {
      throw new Error(`Unexpected response: no repository.issueFields for ${repo.owner}/${repo.name}`);
    }
    return issueFields;
  };

  /** 名前で single select の Issue Field を引き、id と選択肢を返す (fetchIssueFields の narrowing 済み版) */
  const fetchSingleSelectField = async (repo: RepositoryRef, fieldName: string) => {
    const issueFields = await fetchIssueFields(repo);
    for (const node of issueFields.nodes ?? []) {
      if (node && "options" in node && node.name === fieldName) {
        return { fieldId: node.id, options: node.options };
      }
    }
    throw new Error(`Issue field "${fieldName}" not found in ${repo.owner}/${repo.name}`);
  };

  const setIssueStatus = async (options: SetIssueStatusOptions) => {
    await request({
      url: GRAPHQL_ENDPOINT,
      document: setIssueFieldValueMutation,
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

  return {
    fetchPage,
    iterateIssues,
    fetchIssueFields,
    fetchSingleSelectField,
    setIssueStatus,
    closeIssue,
  };
};
