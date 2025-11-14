import gql from 'graphql-tag';

export const docControllerDashboardType = gql`
    type User {
        id: ID
        displayName: String
    }

    type DocumentItem {
        id: ID
        title: String
        document_code: String
        createdAt: String
        status: String
        revision_no: Int
        effectivity: String
        created_by: ID
        status_meta: StatusMeta
        created_by_user: User
        createdByName: String
    }

    type StatusMeta {
        published_at: String
    }

    type DocControllerDashboard {
        udcPending: Int
        ldcEndorsed: Int
        dcoReady: Int
        udcApprovals: Int
        ldcApprovals: Int
        dcoApprovals: Int
        approved: Int
        published: Int
        total: Int
        publishedTemplates: [DocumentItem]
    }

    type Query {
        docControllerDashboard: DocControllerDashboard
    }
`;
