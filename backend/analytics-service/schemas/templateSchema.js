import gql from 'graphql-tag';

export const templateType = gql`
    type User {
        id: ID
        firstname: String
        lastname: String
    }

    type Template {
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
    }

    type StatusMeta {
        published_at: String
    }

    type TemplateDashboard {
        countPublished: Int
        countPendingApproval: Int
        countApproved: Int
        getPublishedTemplates: [Template]
    }

    type Query {
        templateDashboard: TemplateDashboard
    }
`;
