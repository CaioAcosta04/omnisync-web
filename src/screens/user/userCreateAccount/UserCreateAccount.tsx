import './UserCreateAccount.css'
import { useMemo, useState } from "react";
import { AiOutlineIdcard, AiFillLock, AiOutlineMail, AiOutlineUser } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { BsBuildings } from "react-icons/bs";
import { AuthForm, type AuthFormField } from "../../../components/authForm/AuthForm";
import { useUserAuthNavigation } from "../../../contexts/UserAuthNavigationContext";
import { API_BASE_URL } from "../../../config/api";

export function UserCreateAccount() {
    const { completeAuthentication } = useUserAuthNavigation()
    const [step, setStep] = useState<1 | 2>(1)
    const [companyData, setCompanyData] = useState<Record<string, string>>({})
    const [userData, setUserData] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const companyFields = useMemo<AuthFormField[]>(
        () => [
            {
                inputDescription: 'Nome da Empresa',
                icon: <BsBuildings size={25} />,
                name: 'companyName',
                label: 'TopInc',
                type: 'text',
                minLength: 2,
                validationMessage: 'Informe o nome da empresa.',
            },
            {
                inputDescription: 'CNPJ',
                icon: <AiOutlineIdcard size={25} />,
                name: 'companyDocument',
                label: '12.345.678/0001-90',
                type: 'text',
                pattern: '^\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}-?\\d{2}$',
                title: 'Informe um CNPJ com 14 dígitos.',
                validationMessage: 'Informe um CNPJ válido com 14 dígitos.',
            },
        ],
        []
    )

    const userFields = useMemo<AuthFormField[]>(
        () => [
            {
                inputDescription: 'Nome Completo',
                icon: <AiOutlineUser size={25} />,
                name: 'name',
                label: 'John Doe',
                type: 'text',
                minLength: 4,
                validationMessage: 'Informe seu nome completo.',
            },
            {
                inputDescription: 'Cpf',
                icon: <AiOutlineIdcard size={25} />,
                name: 'cpf',
                label: '123.456.789-10',
                type: 'text',
                pattern: '^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$',
                title: 'Informe um CPF com 11 dígitos.',
                validationMessage: 'Informe um CPF válido com 11 dígitos.',
            },
            {
                inputDescription: 'Email',
                icon: <AiOutlineMail size={25} />,
                name: 'email',
                label: 'johndoe@email.com',
                type: 'email',
                validationMessage: 'Informe um email válido.',
                autoComplete: 'email',
            },
            {
                inputDescription: 'Senha',
                icon: <AiFillLock size={25} />,
                name: 'password',
                label: 'Crie uma senha forte',
                type: 'password',
                minLength: 6,
                maxLength: 100,
                validationMessage: 'A senha deve ter entre 6 e 100 caracteres.',
                autoComplete: 'new-password',
            },
        ],
        []
    )

    const goToUserStep = async (data: Record<string, string>) => {
        setIsSubmitting(true)
        setErrorMessage('')

        try {
            const normalizedDocument = data.companyDocument?.trim().replace(/\D/g, '')
            const response = await fetch(
                `${API_BASE_URL}/api/client/checkCNPJ/${encodeURIComponent(normalizedDocument ?? '')}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )

            if (!response.ok) {
                const message = await response.text()
                throw new Error(message || 'Não foi possível validar o CNPJ.')
            }

            const result = await response.json() as boolean
            if (result) {
                setErrorMessage('Já existe empresa cadastrada com esse CNPJ.')
                return
            }

            setCompanyData({
                companyName: data.companyName?.trim() ?? '',
                companyDocument: normalizedDocument ?? '',
            })

            setStep(2)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro inesperado ao criar empresa.'
            setErrorMessage(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmit = async (data: Record<string, string>) => {
        if (!companyData.companyName || !companyData.companyDocument) {
            setErrorMessage('Empresa não encontrada. Volte e refaça a etapa 1.')
            setStep(1)
            return
        }

        setIsSubmitting(true)
        setErrorMessage('')
        setUserData(data)

        try {
            const companyResponse = await fetch(`${API_BASE_URL}/api/client`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: companyData.companyName,
                    document: companyData.companyDocument,
                }),
            })

            if (!companyResponse.ok) {
                const message = await companyResponse.text()
                throw new Error(message || 'Não foi possível criar a empresa.')
            }

            const companyResult = await companyResponse.json() as { id?: number }
            const systemClientId = companyResult.id

            if (!systemClientId) {
                throw new Error('Empresa criada sem retorno de ID.')
            }

            const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    systemClientId,
                    name: data.name?.trim(),
                    email: data.email?.trim(),
                    password: data.password,
                    resource: {
                        cpf: data.cpf?.trim(),
                    },
                }),
            })

            if (!registerResponse.ok) {
                const message = await registerResponse.text()
                throw new Error(message || 'Não foi possível criar o usuário.')
            }

            await registerResponse.json()
            setErrorMessage('')
            completeAuthentication()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro inesperado ao criar conta.'
            setErrorMessage(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleGoogleSignIn = () => {
        // redirecione para o backend de OAuth do Google aqui
    }

    const handleAppleSignIn = () => {
        // redirecione para o backend de OAuth da Apple aqui
    }

    return (
        <div className="create-account">
            <div className="step-header">
                <p className="step-indicator">Etapa {step} de 2</p>
                {step === 2 ? (
                    <button
                        type="button"
                        className="back-step-button"
                        onClick={() => setStep(1)}
                        disabled={isSubmitting}
                    >
                        Voltar para Etapa 1
                    </button>
                ) : null}
            </div>
            <AuthForm
                title={step === 1 ? 'Criar Empresa' : 'Criar Conta'}
                text={step === 1
                    ? 'Primeiro, informe os dados da sua empresa.'
                    : 'Agora preencha seus dados para finalizar o cadastro.'}
                fields={step === 1 ? companyFields : userFields}
                submitLabel={step === 1 ? 'Próximo' : (isSubmitting ? 'Criando conta...' : 'Criar Conta')}
                onSubmit={step === 1 ? goToUserStep : handleSubmit}
                onValidationError={setErrorMessage}
                errorMessage={errorMessage}
                initialValues={step === 1 ? companyData : userData}
                onValuesChange={step === 1 ? setCompanyData : setUserData}
                submitDisabled={isSubmitting}
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