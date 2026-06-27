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
import PaymentSuccess from "../pages/payment/payment-success.page.vue";
import PaymentCancel from "../pages/payment/payment-cancel.page.vue";
import SubscriptionPage from "../pages/subscription/subscription.page.vue";
import { PaymentApiService } from "../services/paymentapi.service.js";
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
                const role = sessionStorage.getItem('userRole');
                if (role === 'ROLE_MUNICIPALITY' || role === 'ROLE_ADMIN') return '/dashboard';
                return true;
            }
        },
        {path: '/dashboard', component: MunicipalityDashboard},
        {path: '/municipality/dashboard', redirect: '/dashboard'},
        {path: '/payment-success', component: PaymentSuccess},
        {path: '/payment-cancel', component: PaymentCancel},
        {path: '/subscription', component: SubscriptionPage},
    ]
});

// Rutas del area municipal que requieren suscripcion activa.
const MUNICIPALITY_GATED = ['/dashboard', '/map'];

async function municipalityHasActiveSub() {
    let active = sessionStorage.getItem('subActive');
    if (active === 'true') return true;
    if (active === 'false') return false;
    // Sin cache: consultar una vez. Fail-open ante errores para no bloquear por fallos de red.
    try {
        const email = sessionStorage.getItem('userEmail');
        if (!email) return true;
        const res = await new PaymentApiService().getSubscription(email);
        active = (res && res.data && res.data.active) ? 'true' : 'false';
        sessionStorage.setItem('subActive', active);
        return active === 'true';
    } catch (e) {
        return true;
    }
}

router.beforeEach(async (to, from, next) => {
    const publicPages = ['/', '/password-recover', '/recover', '/map', '/payment-success', '/payment-cancel'];
    const token = sessionStorage.getItem('authToken');

    // Bloqueo por suscripcion: SOLO municipalidad logueada, antes de servir paginas publicas (ej. /map).
    const roleEarly = sessionStorage.getItem('userRole');
    if (token && roleEarly === 'ROLE_MUNICIPALITY' && MUNICIPALITY_GATED.includes(to.path)) {
        const ok = await municipalityHasActiveSub();
        if (!ok) {
            next('/subscription');
            return;
        }
    }

    if (publicPages.includes(to.path)) {
        next();
        return;
    }

    if (!token) {
        if (!publicPages.includes(to.path) && !to.path.startsWith('/report/')) {
            next('/');
        } else {
            next();
        }
        return;
    }

    if (to.path === '/login') {
        next('/dashboard');
        return;
    }

    next();
});

export default router;
