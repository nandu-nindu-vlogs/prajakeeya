import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Files
export const getFiles = () => api.get('/files');
export const getFile = (id) => api.get(`/files/${id}`);
export const submitFile = (data) => api.post('/files', data);
export const actionFile = (id, data) => api.patch(`/files/${id}/action`, data);
export const getFileStats = () => api.get('/files/public/stats');

// Beneficiaries
export const getBeneficiaries = () => api.get('/beneficiaries');
export const addBeneficiary = (data) => api.post('/beneficiaries', data);
export const verifyBeneficiary = (id, data) => api.patch(`/beneficiaries/${id}/verify`, data);
export const transferBeneficiary = (id, data) => api.patch(`/beneficiaries/${id}/transfer`, data);

// Procurement / Tenders
export const getTenders = () => api.get('/tenders');
export const getTenderDetail = (id) => api.get(`/tenders/${id}`);
export const createTender = (data) => api.post('/tenders', data);
export const awardTender = (id) => api.post(`/tenders/${id}/award`);
// Contractor bidding
export const submitBid = (tenderId, data) => api.post(`/tenders/${tenderId}/bid`, data);
export const getMyBids = () => api.get('/tenders/contractor/my-bids');
export const getContractorProfile = () => api.get('/tenders/contractor/profile');
export const updateContractorProfile = (data) => api.put('/tenders/contractor/profile', data);

// Finance
export const getPOs = () => api.get('/finance/pos');
export const createPO = (data) => api.post('/finance/pos', data);
export const submitGR = (id, data) => api.post(`/finance/pos/${id}/gr`, data);
export const submitInvoice = (id, data) => api.post(`/finance/pos/${id}/invoice`, data);
export const getBudget = () => api.get('/finance/budget');

// Ledger
export const getLedger = (params) => api.get('/ledger', { params });
export const getPublicLedger = () => api.get('/ledger/public');
export const verifyChain = () => api.get('/ledger/verify');

// Dashboard
export const getPublicDashboard = () => api.get('/dashboard/public');
export const getAdminDashboard = () => api.get('/dashboard/admin');
export const getOfficerDashboard = () => api.get('/dashboard/officer');
export const resolveAlert = (id) => api.patch(`/dashboard/alerts/${id}/resolve`);

// Grievances
export const getGrievances = () => api.get('/grievances');
export const getGrievance = (id) => api.get(`/grievances/${id}`);
export const createGrievance = (data) => api.post('/grievances', data);
export const respondGrievance = (id, data) => api.post(`/grievances/${id}/respond`, data);
export const escalateGrievance = (id) => api.post(`/grievances/${id}/escalate`);
export const getGrievanceStats = () => api.get('/grievances/stats');

// Documents (instant delivery)
export const generateDocument = (data) => api.post('/documents/generate', data);
export const getMyDocuments = () => api.get('/documents/my');
export const getDocument = (id) => api.get(`/documents/${id}`);
export const getAvailableDocTypes = () => api.get('/documents/types/available');

// Analytics
export const getAnalyticsOverview = () => api.get('/analytics/overview');
export const getSlaAnalytics = () => api.get('/analytics/sla');
export const getOfficerAnalytics = () => api.get('/analytics/officers');
export const getFraudAnalytics = () => api.get('/analytics/fraud');

// Projects (public — no auth required to view)
export const getProjects = (params) => api.get('/projects', { params });
export const getProjectStats = () => api.get('/projects/stats');
export const getProjectDetail = (id) => api.get(`/projects/${id}`);
export const fileObjection = (id, data) => api.post(`/projects/${id}/objections`, data);
export const respondToObjection = (id, objId, data) => api.post(`/projects/${id}/respond/${objId}`, data);
export const postProjectUpdate = (id, data) => api.post(`/projects/${id}/updates`, data);
export const getMyContractorProjects = () => api.get('/projects/contractor/my');
