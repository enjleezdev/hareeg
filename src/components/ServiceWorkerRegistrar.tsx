
"use client";

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function ServiceWorkerRegistrar() {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
      const wb = window.workbox;
      // Add event listeners for PWA lifecycle events.
      wb.addEventListener('installed', (event) => {
        if (event.isUpdate) {
          toast({
            title: "تحديث جديد متوفر",
            description: "أغلق جميع علامات تبويب التطبيق ثم أعد فتحه لتطبيق التحديث.",
            duration: 10000, // Show for 10 seconds
          });
        } else {
          toast({
            title: "التطبيق جاهز للاستخدام بدون انترنت",
            description: "تم تخزين محتوى التطبيق للاستخدام في وضع عدم الاتصال.",
          });
        }
      });

      // Register the service worker.
      wb.register();
    } else if ('serviceWorker' in navigator) {
      // Fallback for browsers that support SW but not Workbox (less likely with modern setups)
      // or if workbox isn't loaded yet for some reason.
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
          // You can add more detailed update handling here if not using Workbox
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
          toast({
            title: "فشل تسجيل عامل الخدمة",
            description: "قد لا تعمل بعض ميزات التطبيق دون اتصال بالإنترنت.",
            variant: "destructive",
          });
        });
    }
  }, [toast]);

  return null; // This component doesn't render anything
}
