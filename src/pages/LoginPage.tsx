
import { LoginForm } from "../components/auth/LoginForm";

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-brand-background flex flex-col items-center justify-center p-4">
      <LoginForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        By continuing, you agree to Mr Scale's <a href="#" className="text-brand-purple hover:underline font-medium">Terms of Service</a> and <a href="#" className="text-brand-purple hover:underline font-medium">Privacy Policy</a>
      </p>
    </div>
  );
};

export default LoginPage;
