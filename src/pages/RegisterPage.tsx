
import { RegisterForm } from "../components/auth/RegisterForm";
import { Link } from "react-router-dom";

const RegisterPage = () => {
  return (
    <div className="min-h-screen bg-brand-background flex flex-col items-center justify-center p-4">
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        By continuing, you agree to Dr. Scale's <Link to="/terms-of-service" className="text-brand-green hover:underline font-medium">Terms of Service</Link> and <Link to="/privacy-policy" className="text-brand-green hover:underline font-medium">Privacy Policy</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
