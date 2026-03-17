import { AiOutlineIdcard, AiFillLock, AiOutlineMail, AiOutlineUser } from "react-icons/ai";
import { AuthForm } from "../../../components/AuthForm";
import './UserCreateAccount.css'
import { BsBuildings } from "react-icons/bs";

export function UserCreateAccount() {
    const fields = [
        { inputDescription: 'Nome Completo', icon: <AiOutlineUser size={25}/>, name: 'name', label: 'John Doe', type: 'string'},
        { inputDescription: 'Cpf', icon: <AiOutlineIdcard size={25}/>, name: 'cpf', label: '123.456.789-10', type: 'string'},
        { inputDescription: 'Nome da Empresa', icon: <BsBuildings size={25}/>, name: 'bussinessName', label: 'TopInc', type: 'string'},
        { inputDescription: 'Email', icon: <AiOutlineMail size={25}/>, name: 'email', label: 'johndoe@email.com', type: 'email'},
        { inputDescription: 'Senha', icon: <AiFillLock size={25}/>, name: 'password', label: 'Crie uma senha forte', type: 'string'},
    ]

    const handleSubmit = (data: Record<string, string>) => {
        console.log('Dados:', data)
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
            <a href="../userLogin/UserLogin">Já tem uma conta? Faça login</a>
        </div>
    )
}