import { createBrowserRouter } from 'react-router-dom';
import ServiceEnded from './pages/ServiceEnded';

export const router = createBrowserRouter([
  { path: '*', element: <ServiceEnded /> },
]);
