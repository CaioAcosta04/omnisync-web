import type { ReactNode } from 'react'
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
}

export function AuthForm({ title, text, fields, submitLabel, onSubmit } : AuthFormProps){

    function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>){
        event.preventDefault()

        const formData = new FormData(event.currentTarget)
        const data = Object.fromEntries(formData) as Record<string, string>

        onSubmit(data)
    }

    return (
        <form className="form" onSubmit={handleSubmit}>
            <h1>{title}</h1>
            <p>{text}</p>
            {fields.map(field => (
                <div key={field.name} className="field-row">
                    <p className="field-desc">{field.inputDescription}</p>
                    <label className="auth-field" htmlFor={field.name}>
                        <span className="auth-field-icon">{field.icon}</span>
                        <input
                            id={field.name}
                            name={field.name}
                            type={field.type}
                            placeholder={field.label} />
                    </label>
                </div>
            ))}
            <button type="submit">{submitLabel}</button>
        </form>
    )
}