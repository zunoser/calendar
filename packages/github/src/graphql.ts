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

export const projectItemFragment = graphql(`
  fragment ProjectItemFields on ProjectV2Item @_unmask {
    id
    updatedAt
    fieldValues(first: 20) {
      nodes {
        ... on ProjectV2ItemFieldDateValue {
          date
          field {
            ... on ProjectV2FieldCommon {
              name
            }
          }
        }
        ... on ProjectV2ItemFieldSingleSelectValue {
          name
          field {
            ... on ProjectV2FieldCommon {
              name
            }
          }
        }
      }
    }
    content {
      __typename
      ... on Issue {
        id
        number
        title
        body
        url
        state
        repository {
          nameWithOwner
        }
      }
      ... on PullRequest {
        number
        title
        url
        repository {
          nameWithOwner
        }
      }
      ... on DraftIssue {
        title
      }
    }
  }
`);

export const projectItemsQuery = graphql(
  `
    query ProjectItems($org: String!, $number: Int!, $pageSize: Int!, $cursor: String) {
      organization(login: $org) {
        projectV2(number: $number) {
          items(first: $pageSize, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              ...ProjectItemFields
            }
          }
        }
      }
    }
  `,
  [projectItemFragment],
);

export const projectStatusQuery = graphql(`
  query ProjectStatus($org: String!, $number: Int!) {
    organization(login: $org) {
      projectV2(number: $number) {
        id
        field(name: "Status") {
          ... on ProjectV2SingleSelectField {
            id
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

export const updateItemStatusMutation = graphql(`
  mutation UpdateItemStatus($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(
      input: { projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { singleSelectOptionId: $optionId } }
    ) {
      projectV2Item {
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

export type ProjectV2Item = FragmentOf<typeof projectItemFragment>;
