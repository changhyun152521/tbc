import express from 'express';
import routes from './routes';
import authRoutes from './routes/auth.routes';
import meRoutes from './routes/me.routes';
import adminRoutes from './routes/admin.routes';
import teacherRoutes from './routes/teacher.routes';
import studentRoutes from './routes/student.routes';
import parentRoutes from './routes/parent.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(express.json());

app.use('/', routes);
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);

app.use(errorHandler);

export default app;
