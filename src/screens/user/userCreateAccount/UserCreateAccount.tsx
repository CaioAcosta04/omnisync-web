import './UserCreateAccount.css'
import { AiOutlineIdcard, AiFillLock, AiOutlineMail, AiOutlineUser } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { AuthForm } from "../../../components/authForm/AuthForm";
import { BsBuildings } from "react-icons/bs";

export function UserCreateAccount() {
    const fields = [
        { inputDescription: 'Nome Completo', icon: <AiOutlineUser size={25} />, name: 'name', label: 'John Doe', type: 'string' },
        { inputDescription: 'Cpf', icon: <AiOutlineIdcard size={25} />, name: 'cpf', label: '123.456.789-10', type: 'string' },
        { inputDescription: 'Nome da Empresa', icon: <BsBuildings size={25} />, name: 'bussinessName', label: 'TopInc', type: 'string' },
        { inputDescription: 'Email', icon: <AiOutlineMail size={25} />, name: 'email', label: 'johndoe@email.com', type: 'email' },
        { inputDescription: 'Senha', icon: <AiFillLock size={25} />, name: 'password', label: 'Crie uma senha forte', type: 'password' },
    ]

    const handleSubmit = (data: Record<string, string>) => {
        console.log('Dados:', data)
    }

    const handleGoogleSignIn = () => {
        // redirecione para o backend de OAuth do Google aqui
    }

    const handleAppleSignIn = () => {
        // redirecione para o backend de OAuth da Apple aqui
    }

    return (
        <div className="create-account">
            <AuthForm
                title="Criar Conta"
                text="Entre no time Omnisync para iniciar a sincronização do seu trabalho entre suas plataformas."
                fields={fields}
                submitLabel="Criar Conta"
                onSubmit={handleSubmit}
            />
            <div className="create-content">
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