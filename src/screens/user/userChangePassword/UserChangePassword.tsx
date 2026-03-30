import "./UserChangePassword.css"
import { AiOutlineMail } from "react-icons/ai"
import { AuthForm } from "../../../components/authForm/AuthForm"

export function UserChangePassword() {

    const fields = [
        { 
            inputDescription: 'Email', 
            icon: <AiOutlineMail size={25} />, 
            name: 'email', 
            label: 'johndoe@email.com', 
            type: 'email' 
        },
    ]

    const handleSubmit = (data: Record<string, string>) => {
        console.log("Dados", data)
    }

    return (
        <div className="change-password">
            <AuthForm
                title="Recuperar Senha"
                text="Não se preocupe, acontece. Entre com seu endereço de email associado que o enviaremos um link para mudar sua senha."
                fields={fields}
                submitLabel="Enviar link"
                onSubmit={handleSubmit}
            />
        </div>
    )
}
