import {createRouter, createWebHistory} from 'vue-router'

import Profile from "../pages/profile/profile.page.vue";
import ReportFormView from "../pages/reports/report-form.page.vue";
import Principal from '../pages/home/main.page.vue'
import UserReportListComponent from '../pages/reports/user-report-list.component.vue'
import reportList from '../pages/reports/report-list.component.vue'
import passwordRecover from '../pages/auth/password-recover.page.vue'
import finalRecover from '../pages/auth/final-recover.page.vue'
import MapCitizen from '../pages/map/map-citizen.page.vue'
import ViewNotificationsComponent from "../pages/notifications/view-notifications.component.vue";
import ReportDetailComponent from "@/pages/reports/report-detail.component.vue";
import MunicipalityDashboard from "../pages/municipality/municipality-dashboard.page.vue";
const router= createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/', component: Principal},
        {path: '/:pathMatch(.*)*', redirect: '/'},//redirect to home page if path is not found
        {path: '/profile', component: Profile},
        {path: '/authority/report', component: UserReportListComponent},
        {path: '/user/report', component: reportList, name: 'reports'},
        {path: '/user/create-report-form', component: ReportFormView},
        { path: '/report/:id',name:'report-detail', component: ReportDetailComponent},
        {path: '/password-recover', component: passwordRecover},
        {path: '/recover', component: finalRecover},
        {path: '/map', component: MapCitizen},
        {path: '/user/map', redirect: '/map'},
        {
            path: '/user/notifications',
            component: ViewNotificationsComponent,
            beforeEnter: () => {
                const role = localStorage.getItem('userRole');
                if (role === 'ROLE_MUNICIPALITY' || role === 'ROLE_ADMIN') return '/dashboard';
                return true;
            }
        },
        {path: '/dashboard', component: MunicipalityDashboard},
        {path: '/municipality/dashboard', redirect: '/dashboard'},
    ]
});

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        if (to.path === '/' || to.path === '/login' || to.path === '/password-recover' || to.path === '/recover') {
            next('/dashboard');
        } else {
            next();
        }
    } else {
        const publicPages = ['/', '/password-recover', '/recover', '/map'];
        if (!publicPages.includes(to.path) && !to.path.startsWith('/report/')) {
            next('/');
        } else {
            next();
        }
    }
});

export default router;
