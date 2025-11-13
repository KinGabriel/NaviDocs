import gql from 'graphql-tag';

export const deanSecDashboardType = gql`
  type LatestForwardedItem {
    id: ID
    title: String
    department: String
    school: String
    forwarded_at: String
    created_by: ID
    deadline: String
    submissionsCount: Int
    submittedCount: Int
    createdAt: String
  }

  type ForwardedByDepartment {
    department: String
    count: Int
  }

  type TemplateSummary {
    id: ID
    title: String
    code: String
    rev: String
    status: String
    createdBy: String
    createdAt: String
  }

  type DeanSecDashboard {
    school: String
    totalForwardedCount: Int
    latestForwarded: [LatestForwardedItem]
  forwardedByDepartment: [ForwardedByDepartment]
  # Template-service fields
    templateSubmittedCount: Int
    recentSubmittedTemplates: [TemplateSummary]
    publishedRecentTemplates: [TemplateSummary]
  }

  extend type Query {
    deanSecDashboard: DeanSecDashboard
  }
`;
