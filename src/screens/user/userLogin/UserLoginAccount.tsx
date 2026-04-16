import "./UserLoginAccount.css"
import { useState } from "react"
import { FcGoogle } from "react-icons/fc"
import { FaApple } from "react-icons/fa"
import { AiFillLock, AiOutlineMail } from "react-icons/ai"
import { AuthForm } from "../../../components/authForm/AuthForm"
import { useUserAuthNavigation } from "../../../contexts/UserAuthNavigationContext"
import { API_BASE_URL } from "../../../config/api"

export function UserLoginAccount() {
    const { goToChangePassword, completeAuthentication } = useUserAuthNavigation()
    const [saveLogin, setSaveLogin] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const fields = [
        { 
            inputDescription: "Email", 
            icon: <AiOutlineMail size={25} />, 
            name: 'email', label: 'johndoe@email.com', 
            type: 'email',
            minLength: 2,
            validationMessage: 'Informe o email.',
        },
        { 
            inputDescription: 'Senha', 
            icon: <AiFillLock size={25} />, 
            name: 'password', 
            label: '********', 
            type: 'password' ,
            minLength: 6,
            validationMessage: 'Informe a senha.',
        },
    ]

    const handleSubmit = async (data: Record<string, string>) => {
        setIsSubmitting(true)
        setErrorMessage('')
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password
                })
            })
    
            if (!response.ok) {
                const message = await response.text()
                throw new Error(message || 'Erro no login')
            }
    
            await response.json()
            completeAuthentication()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro inesperado'
            setErrorMessage(message)
        } finally {
            setIsSubmitting(false)
        }
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
                submitLabel={isSubmitting ? 'Entrando...' : 'Logar'}
                onSubmit={handleSubmit}
                onValidationError={setErrorMessage}
                errorMessage={errorMessage}
                submitDisabled={isSubmitting}
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