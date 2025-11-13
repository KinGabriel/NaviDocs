import gql from 'graphql-tag';

export const facultyDashboardType = gql`
    type DocumentInfo {
        id: ID
        title: String
        created_by: ID
        createdAt: String
    }

    type FacultySubmission {
        binId: ID
        binTitle: String
        templateId: ID
        submissionId: ID
        status: String
        submittedAt: String
        deadline: String
        department: String
        school: String
        documents: [DocumentInfo]
    }

    type FacultyAssignedBin {
        id: ID
        title: String
        department: String
        school: String
        deadline: String
        submissionsCount: Int
        submittedCount: Int
        onTimeCount: Int
        lateCount: Int
        pendingCount: Int
        completion: String
        userSubmission: FacultySubmission
    }

    type FacultyDashboard {
        total: Int
        totalAssigned: Int
        submittedCount: Int
        onTimeCount: Int
        lateCount: Int
        pendingCount: Int
        submissions: [FacultySubmission]
        assignedBins: [FacultyAssignedBin]
        upcomingAssigned: [FacultyAssignedBin]
        dueTodayAssigned: [FacultyAssignedBin]
        overdueAssigned: [FacultyAssignedBin]
    }

    extend type Query {
        facultyDashboard: FacultyDashboard
    }
`;
