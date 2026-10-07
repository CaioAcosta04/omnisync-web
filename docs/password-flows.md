# Fluxos de senha

Depende do backend da branch `refactor/user-password-management`.

- `/reset-password?token=...`: rota pública, inclusive quando já existe sessão.
  Envia `{ token, newPassword }` para `POST /api/auth/reset-password`.
- Configurações → Segurança: exige senha atual e envia os campos `current_password`,
  `new_password` e `new_password_confirmation` para `PUT /api/users/me/password`.
- Usuários → Redefinir senha: disponível apenas com a permissão efetiva `USER_MANAGE`
  e para outro usuário. Envia a nova senha e a confirmação para `PUT /api/users/{id}/password`.

As permissões explícitas retornadas pelo backend prevalecem sobre os campos legados,
inclusive quando a lista é vazia. O nome `ADMIN` sozinho não libera a ação. O backend
continua responsável por verificar autorização e isolamento entre empresas.

Os três formulários validam confirmação e a política do backend (6–100 caracteres,
não vazia e até 72 bytes UTF-8). Um bloqueio síncrono impede envios duplicados. Na
redefinição administrativa, o modal não pode ser fechado durante o envio ou o sucesso.

Após sucesso, os campos são apagados, uma confirmação aparece por 1,5 segundo e a
sessão do navegador é encerrada antes de retornar ao login. No fluxo administrativo,
isso encerra a sessão do operador, conforme o critério do card; não revoga remotamente
as sessões do usuário alvo.

## Credenciais e mensagens

Senhas e token ficam somente em memória durante o formulário. Não são colocados em
storage, logs ou mensagens. O token é removido da URL com `replaceState` após a abertura;
recarregar a página requer reabrir o link do e-mail. A página usa `no-referrer` e não
carrega os providers de marketplace/debug. Erros dos endpoints de senha são traduzidos
por status HTTP, sem mostrar o corpo bruto retornado pelo servidor.

O token chega originalmente na URL do e-mail: configurar também os logs de acesso do
hosting/proxy para não registrar parâmetros sensíveis. O frontend não controla esses logs.

## Deploy e validação

O `vercel.json` mantém o proxy de API e inclui o rewrite de `/reset-password` para
`/index.html`. Em outro hosting, configurar o mesmo fallback SPA. O backend deve usar
o endereço desse frontend em `app.frontend.reset-password-url`.

```sh
npm run test:run
npm run build
npm run lint
npx playwright test e2e/password-flows.spec.ts
```

Os testes de navegador cobrem os três fluxos em 1280px e 390px, permissão negada e
links ausentes/rejeitados. As APIs são simuladas; não acessam o banco nem enviam e-mails.
