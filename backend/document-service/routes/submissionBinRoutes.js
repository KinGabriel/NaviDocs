import express from 'express';
import { authenticateJWT } from '../middleware/authenticationMiddleware.js';
import {
  createSubmissionBin,
  listBins,
  listBinsByDocument,
  getSubmissionByDocument,
  getBin,
  updateBin,
  upsertSubmission,
  submitDocument,
  unsubmitDocument,
  returnSubmission,
  // approveSubmission, // disabled for now
  forwardBin,
  evaluateBinCompletion,
} from '../controllers/documentWorkFlow.js';

const router = express.Router();

// All submission bin routes require authentication
router.use(authenticateJWT);

router.post('/', createSubmissionBin);
router.get('/', listBins);
router.get('/by-document/:documentId', listBinsByDocument);
router.get('/document/:documentId', getSubmissionByDocument);
router.get('/:id', getBin);
router.patch('/:id', updateBin);


router.put('/:id/submissions', upsertSubmission);
router.patch('/:id/submissions', upsertSubmission);
router.post('/:id/submissions/:submissionId/submit', submitDocument);
router.post('/:id/submissions/:submissionId/unsubmit', unsubmitDocument);
router.post('/:id/submissions/:submissionId/return', returnSubmission);
// router.post('/:id/submissions/:submissionId/approve', approveSubmission); // disabled for now
router.post('/:id/forward', forwardBin);
router.post('/:id/evaluate', evaluateBinCompletion);

export default router;
