import { useState } from "react"
import "./UserLoginAccount.css"
import { AiFillLock, AiOutlineMail } from "react-icons/ai"
import { AuthForm } from "../../../components/authForm/AuthForm"
import { useUserAuthNavigation } from "../../../contexts/UserAuthNavigationContext"
import { FcGoogle } from "react-icons/fc"
import { FaApple } from "react-icons/fa"

export function UserLoginAccount() {
    const { goToChangePassword } = useUserAuthNavigation()
    const [saveLogin, setSaveLogin] = useState(false)

    const fields = [
        { inputDescription: "Email", icon: <AiOutlineMail size={25} />, name: 'email', label: 'johndoe@email.com', type: 'email' },
        { inputDescription: 'Senha', icon: <AiFillLock size={25} />, name: 'password', label: '********', type: 'password' },
    ]

    const handleSubmit = (data: Record<string, string>) => {
        console.log("Dados:", data, "Salvar login:", saveLogin)
    }

    const handleSaveLogin = () => {
        setSaveLogin(prev => !prev)
    }

    const handleGoogleSignIn = () => {
        // redirecione para o backend de OAuth do Google aqui
    }

    const handleAppleSignIn = () => {
        // redirecione para o backend de OAuth da Apple aqui
    }

    return (
        <div className="login-account">
            <AuthForm
                title="Bem vindo"
                text="Entre com seus dados para logar"
                fields={fields}
                submitLabel="Logar"
                onSubmit={handleSubmit}
                passwordLabelEnd={
                    <button
                        type="button"
                        className="forgot-password-link"
                        onClick={goToChangePassword}
                    >
                        Esqueceu a senha?
                    </button>
                }
            >
                <div className="save-login">
                    <button type="button" onClick={handleSaveLogin} className={saveLogin ? 'active' : ''}></button>
                    <p>Lembrar de mim por 30 dias</p>
                </div>
            </AuthForm>
            <div className="login-content">
                <div className="divider">
                    <hr />
                    <span>Ou entre com</span>
                    <hr />
                </div>
                <div className="social-login-row">
                    <button type="button" className="social-login google-login" onClick={handleGoogleSignIn}>
                        <FcGoogle size={20} />
                        Google
                    </button>
                    <button type="button" className="social-login apple-login" onClick={handleAppleSignIn}>
                        <FaApple size={20} />
                        Apple
                    </button>
                </div>
            </div>
        </div>
    )
}