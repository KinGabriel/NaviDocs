import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import dotenv from 'dotenv';
import { adminDashboardType } from './schemas/adminDashboardSchema.js';
import { docControllerDashboardType } from './schemas/docControllerDashboardSchema.js';
import { deptHeadDashboardType } from './schemas/deptHeadDashboardSchema.js';
import { facultyDashboardType } from './schemas/facultyDashboardSchema.js';
import { resolvers } from './resolvers/aggregator.js';
import { authenticateJWT } from "./middleware/authenticationMiddleware.js";
import cookieParser from 'cookie-parser';


dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "127.0.0.1";
async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const server = new ApolloServer({ typeDefs: [adminDashboardType, docControllerDashboardType, deptHeadDashboardType, facultyDashboardType], resolvers });
  await server.start();

  app.use(
    '/graphql',
    authenticateJWT,
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: req.user,
        token: req.cookies.token 
      }),
    })
  );


  app.listen(PORT, HOST, () => {
    console.log(`Analytics GraphQL server running at http://${HOST}:${PORT}/graphql`);
  });
}

startServer();
