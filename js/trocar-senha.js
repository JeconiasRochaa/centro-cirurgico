// ============ js/trocar-senha.js ============
import { getSession, logout, changeOwnPassword, homePageFor } from './auth.js';

const session = getSession();
if (!session) {
    window.location.href = 'login.html';
}

document.getElementById('linkSair').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

if (session && !session.mustChangePassword) {
    document.getElementById('subtitleTroca').textContent = `Olá, ${session.name}! Defina uma nova senha de acesso quando quiser.`;
}

const form = document.getElementById('formTrocarSenha');
const erroDiv = document.getElementById('erroTrocarSenha');
const btn = document.getElementById('btnTrocarSenha');
const btnTexto = document.getElementById('btnTrocarSenhaTexto');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroDiv.classList.remove('show');

    const nova = document.getElementById('novaSenha').value;
    const confirmar = document.getElementById('confirmarSenha').value;

    if (nova.length < 4) {
        erroDiv.textContent = 'A nova senha deve ter pelo menos 4 caracteres.';
        erroDiv.classList.add('show');
        return;
    }
    if (nova === '12345') {
        erroDiv.textContent = 'Escolha uma senha diferente da senha padrão (12345).';
        erroDiv.classList.add('show');
        return;
    }
    if (nova !== confirmar) {
        erroDiv.textContent = 'As senhas digitadas não coincidem.';
        erroDiv.classList.add('show');
        return;
    }

    btn.disabled = true;
    btnTexto.textContent = 'Salvando...';

    try {
        await changeOwnPassword(session.username, nova);
        window.location.href = homePageFor(session.role);
    } catch (err) {
        console.error('Falha ao trocar senha:', err);
        erroDiv.textContent = 'Não foi possível trocar a senha agora. Tente novamente.';
        erroDiv.classList.add('show');
        btn.disabled = false;
        btnTexto.textContent = 'Salvar nova senha';
    }
});
