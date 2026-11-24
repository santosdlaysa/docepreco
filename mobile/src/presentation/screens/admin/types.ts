export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminUsers: { subscriptionStatus?: 'active' | 'expiring' | 'expired' } | undefined;
  AdminLogs: undefined;
  AdminUserDetail: { userId: string };
  AdminPix: undefined;
  AdminSupport: undefined;
  AdminSupportChat: { userId: string; companyName: string };
  AdminBanners: undefined;
  AdminNotifications: undefined;
  AdminCoupons: undefined;
};
