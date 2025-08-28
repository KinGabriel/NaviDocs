
import { adminDashboardResolver } from './adminDashboardResolver.js';
import { templateDashboardResolvers } from './templateDashboardResolvers.js';

export const resolvers = {
  Query: {
    ...adminDashboardResolver.Query,
    ...templateDashboardResolvers.Query
  },
  ...(templateDashboardResolvers.Template && { Template: templateDashboardResolvers.Template })
};
