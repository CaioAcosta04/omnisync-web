import { useState, type ReactNode } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import './AuthForm.css'

interface Field {
    icon: ReactNode
    name: string
    label: string
    type: string
    inputDescription: string
}

interface AuthFormProps {
    title: string
    text: string
    fields: Field[]
    submitLabel: string
    onSubmit: (data: Record<string, string>) => void
    children?: ReactNode
    /** Conteúdo à direita na linha do rótulo do campo senha (ex.: “Esqueceu a senha?”). */
    passwordLabelEnd?: ReactNode
}

interface PasswordFieldProps {
    field: Field
    labelEnd?: ReactNode
}

function PasswordField({ field, labelEnd }: PasswordFieldProps) {
    const [visible, setVisible] = useState(false)

    return (
        <div className="field-row">
            {labelEnd ? (
                <div className="field-label-row">
                    <p className="field-desc">{field.inputDescription}</p>
                    {labelEnd}
                </div>
            ) : (
                <p className="field-desc">{field.inputDescription}</p>
            )}
            <label className="auth-field" htmlFor={field.name}>
                <span className="auth-field-icon">{field.icon}</span>
                <input
                    id={field.name}
                    name={field.name}
                    type={visible ? 'text' : 'password'}
                    placeholder={field.label}
                />
                <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setVisible(prev => !prev)}
                    tabIndex={-1}
                >
                    {visible ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
            </label>
        </div>
    )
}

export function AuthForm({
    title,
    text,
    fields,
    submitLabel,
    onSubmit,
    children,
    passwordLabelEnd,
}: AuthFormProps) {

    function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const data = Object.fromEntries(formData) as Record<string, string>
        onSubmit(data)
    }

    return (
        <form className="form" onSubmit={handleSubmit}>
            <h1>{title}</h1>
            <p>{text}</p>
            {fields.map(field =>
                field.type === 'password' ? (
                    <PasswordField
                        key={field.name}
                        field={field}
                        labelEnd={passwordLabelEnd}
                    />
                ) : (
                    <div key={field.name} className="field-row">
                        <p className="field-desc">{field.inputDescription}</p>
                        <label className="auth-field" htmlFor={field.name}>
                            <span className="auth-field-icon">{field.icon}</span>
                            <input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                placeholder={field.label}
                            />
                        </label>
                    </div>
                )
            )}
            <div className="form-footer">
                {children}
                <button type="submit" className="submit-button">{submitLabel}</button>
            </div>
        </form>
    )
}