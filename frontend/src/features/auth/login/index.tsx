import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/assets/logo'
import { LoginForm } from './components/login-form'

export function Login() {
  return (
    <div className='container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[400px] sm:p-8'>
        <div className='mb-4 flex items-center justify-center'>
          <Logo className='me-2' />
          <h1 className='text-xl font-medium'>企账通 SCRM</h1>
        </div>
        <Card className='gap-4'>
          <CardHeader>
            <CardTitle className='text-lg tracking-tight'>登录</CardTitle>
            <CardDescription>
              输入用户名和密码登录系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm className='grid gap-3' />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
