const STORAGE_KEY = 'dashboard_despesas';

function carregarDespesas() {
    const dadosSalvos = localStorage.getItem(STORAGE_KEY);
    if (dadosSalvos) {
        return JSON.parse(dadosSalvos);
    } else {
        return [
           ];
    }
}

let despesas = carregarDespesas();

function salvarDespesas() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(despesas));
}

function formatMoney(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getTodayStr() {
    const hoje = new Date();
    return hoje.toISOString().slice(0,10);
}

function updateDateHeader() {
    const hoje = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dataFormatada = hoje.toLocaleDateString('pt-BR', options);
    dataFormatada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    document.getElementById('dataAtualSpan').innerText = dataFormatada;
}

function getDespesasHoje() {
    const hoje = getTodayStr();
    return despesas.filter(d => d.data === hoje);
}

function getDespesasUltimos7Dias() {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);
    const dataLimite = seteDiasAtras.toISOString().slice(0,10);
    return despesas.filter(d => d.data >= dataLimite);
}

function atualizarCards() {
    // total hoje
    const despesasHoje = getDespesasHoje();
    const totalHoje = despesasHoje.reduce((acc, d) => acc + d.valor, 0);
    document.getElementById('totalHoje').innerText = formatMoney(totalHoje);

    // total semana
    const despesasSemana = getDespesasUltimos7Dias();
    const totalSemana = despesasSemana.reduce((acc, d) => acc + d.valor, 0);
    document.getElementById('totalSemana').innerText = formatMoney(totalSemana);

    // media diária da semana (média simples baseada nos 7 dias)
    const mediaDiaria = totalSemana / 7;
    document.getElementById('mediaDia').innerText = formatMoney(mediaDiaria);

    // maior gasto do dia
    if (despesasHoje.length === 0) {
        document.getElementById('maiorGasto').innerText = formatMoney(0);
    } else {
        const maior = Math.max(...despesasHoje.map(d => d.valor));
        document.getElementById('maiorGasto').innerText = formatMoney(maior);
    }
}

function renderizarTabela() {
    const tbody = document.getElementById('corpoTabela');
    if (despesas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="sem-dados">Nenhuma despesa registrada. Adicione uma! </td></tr>';
        return;
    }

    const despesasOrdenadas = [...despesas].sort((a,b) => b.data.localeCompare(a.data));
    tbody.innerHTML = '';
    despesasOrdenadas.forEach(desp => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = desp.descricao;
        row.insertCell(1).innerHTML = `<strong>${formatMoney(desp.valor)}</strong>`;
        row.insertCell(2).innerHTML = `<span class="categoria-badge">${desp.categoria}</span>`;
        row.insertCell(3).innerText = desp.data;
        const btnCell = row.insertCell(4);
        const btnExcluir = document.createElement('button');
        btnExcluir.innerText = '🗑️ Excluir';
        btnExcluir.className = 'btn-excluir';
        btnExcluir.onclick = () => excluirDespesa(desp.id);
        btnCell.appendChild(btnExcluir);
    });
}

function excluirDespesa(id) {
    despesas = despesas.filter(d => d.id !== id);
    salvarDespesas();          
    renderizarTabela();
    atualizarCards();
    renderizarGrafico();
}

function renderizarGrafico() {
    const despesasSemana = getDespesasUltimos7Dias();
    const categoriasMap = new Map();
    despesasSemana.forEach(desp => {
        const cat = desp.categoria;
        const valor = desp.valor;
        categoriasMap.set(cat, (categoriasMap.get(cat) || 0) + valor);
    });

    const container = document.getElementById('graficoContainer');
    if (categoriasMap.size === 0) {
        container.innerHTML = '<div class="sem-dados">📭 Sem despesas nos últimos 7 dias.<br>Adicione despesas para ver o gráfico.</div>';
        return;
    }

    const categoriasOrdenadas = Array.from(categoriasMap.entries()).sort((a,b) => b[1] - a[1]);
    const totalGeral = categoriasOrdenadas.reduce((sum, [_, val]) => sum + val, 0);

    let html = '';
    for (let [categoria, valor] of categoriasOrdenadas) {
        const percent = totalGeral > 0 ? (valor / totalGeral) * 100 : 0;
        const largura = Math.max(5, percent); // mínimo visual
        html += `
            <div class="barra-item">
                <div class="barra-label">
                    <span>${categoria.charAt(0).toUpperCase() + categoria.slice(1)}</span>
                    <span>${formatMoney(valor)} (${percent.toFixed(1)}%)</span>
                </div>
                <div class="barra-bg">
                    <div class="barra-fill" style="width: ${largura}%; background: #3b82f6;">${percent >= 15 ? `R$ ${valor.toFixed(2)}` : ''}</div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function adicionarDespesa() {
    const descricao = document.getElementById('descricaoInput').value.trim();
    let valor = parseFloat(document.getElementById('valorInput').value);
    const categoria = document.getElementById('categoriaInput').value;

    if (!descricao) {
        alert('Preencha a descrição da despesa');
        return;
    }
    if (isNaN(valor) || valor <= 0) {
        alert('Informe um valor válido (maior que zero)');
        return;
    }

    const hoje = getTodayStr();
    const novaDespesa = {
        id: Date.now(),
        descricao: descricao,
        valor: valor,
        categoria: categoria,
        data: hoje
    };

    despesas.push(novaDespesa);
    salvarDespesas();       

    document.getElementById('descricaoInput').value = '';
    document.getElementById('valorInput').value = '';

    renderizarTabela();
    atualizarCards();
    renderizarGrafico();
}

document.addEventListener('DOMContentLoaded', () => {
    updateDateHeader();
    renderizarTabela();
    atualizarCards();
    renderizarGrafico();

    document.getElementById('btnAdicionar').addEventListener('click', adicionarDespesa);
    const inputsEnter = ['descricaoInput', 'valorInput'];
    inputsEnter.forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') adicionarDespesa();
        });
    });
});