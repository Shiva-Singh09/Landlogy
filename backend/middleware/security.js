import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { UPLOAD_DIR } from '../config/upload.js';

// Cross-cutting app middleware — single source of truth for CORS, body limits,
// static uploads serving and global rate limiting.
export const applySecurityMiddleware = (app) => {
  app.use(cors({origin:process.env.CLIENT_ORIGIN?.split(',').map(x=>x.trim()).filter(Boolean)||true,methods:['GET','POST','PATCH','DELETE']}));
  app.use(express.json({limit:'32kb'}));
  app.use('/uploads', express.static(UPLOAD_DIR));
  app.use(rateLimit({windowMs:15*60*1000,max:40,standardHeaders:true,legacyHeaders:false}));
};
