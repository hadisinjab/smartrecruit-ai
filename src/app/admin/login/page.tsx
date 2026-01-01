import { redirect } from 'next/navigation'
import { routing } from '@/i18n/routing'

export default function AdminLoginRedirectPage() {
  redirect(`/${routing.defaultLocale}/admin/login`)
}


