import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import dotenv from 'dotenv';
import { userType } from './schemas/userSchema.js';
import { resolvers } from './resolvers/index.js';
import { authenticateJWT } from "../user-service/middleware/authenticationMiddleware.js";
import cookieParser from 'cookie-parser';

dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: FRONTEND_URL, credentials: true }));


  const server = new ApolloServer({ typeDefs: userType, resolvers });
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

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Analytics GraphQL server running at http://localhost:${PORT}/graphql`);
  });
}

startServer();
