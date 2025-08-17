
import gql from 'graphql-tag';

export const templateType = gql`
	type PublishedTemplate {
        id: ID
		title: String
		document_code: String
		createdAt: String
		status: String
		revision_no: Int
		effectivity: String
		created_by: ID
		status_meta: StatusMeta
	}

	type StatusMeta {
		published_at: String
	}

	type TemplateDashboard {
		countPublished: Int
		countDraft: Int
		countPendingApproval: Int
		getPublishedTemplates: [PublishedTemplate]
	}

	type Query {
		templateDashboard: TemplateDashboard
	}
`;
