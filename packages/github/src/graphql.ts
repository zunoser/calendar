// GraphQL ドキュメント定義 (query / mutation)。型は gql.tada がスキーマ (graphql-env.d.ts) と文字列から推論する。

import { initGraphQLTada, type FragmentOf } from "gql.tada";
import type { introspection } from "./graphql-env";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    Date: string;
    DateTime: string;
    URI: string;
  };
}>();

export const issueFragment = graphql(`
  fragment CalendarIssueFields on Issue @_unmask {
    id
    number
    title
    body
    url
    state
    updatedAt
    repository {
      nameWithOwner
    }
    labels(first: 100) {
      nodes {
        color
      }
    }
    issueFieldValues(first: 20) {
      nodes {
        ... on IssueFieldDateValue {
          value
          field {
            ... on IssueFieldCommon {
              name
            }
          }
        }
        ... on IssueFieldSingleSelectValue {
          name
          field {
            ... on IssueFieldCommon {
              name
            }
          }
        }
      }
    }
    assignees(first: 100) {
      nodes {
        login
      }
    }
    comments(last: 100) {
      nodes {
        body
      }
    }
  }
`);

export const issuesQuery = graphql(
  `
    query RepositoryIssues($owner: String!, $name: String!, $pageSize: Int!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        issues(first: $pageSize, after: $cursor, states: [OPEN, CLOSED]) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            ...CalendarIssueFields
          }
        }
      }
    }
  `,
  [issueFragment],
);

export const issueFieldsQuery = graphql(`
  query RepositoryIssueFields($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      issueFields(first: 50) {
        nodes {
          ... on IssueFieldSingleSelect {
            id
            name
            options {
              id
              name
            }
          }
        }
      }
    }
  }
`);

export const setIssueFieldValueMutation = graphql(`
  mutation SetIssueFieldValue($issueId: ID!, $fieldId: ID!, $optionId: ID!) {
    setIssueFieldValue(
      input: { issueId: $issueId, issueFields: [{ fieldId: $fieldId, singleSelectOptionId: $optionId }] }
    ) {
      issue {
        id
      }
    }
  }
`);

export const closeIssueMutation = graphql(`
  mutation CloseIssue($issueId: ID!) {
    closeIssue(input: { issueId: $issueId }) {
      issue {
        id
        state
      }
    }
  }
`);

export const addIssueCommentMutation = graphql(`
  mutation AddIssueComment($issueId: ID!, $body: String!) {
    addComment(input: { subjectId: $issueId, body: $body }) {
      commentEdge {
        node {
          id
        }
      }
    }
  }
`);

export type CalendarIssue = FragmentOf<typeof issueFragment>;
