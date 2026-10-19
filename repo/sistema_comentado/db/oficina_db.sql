-- =========================================================
-- Banco de dados: oficina_db  (Oficina Mecânica AutoCerta)
-- SGBD: SQLite 3
-- =========================================================
PRAGMA foreign_keys = ON;

CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL            -- hash bcrypt
);

CREATE TABLE clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,             -- criptografado (AES-256-GCM)
    telefone TEXT,
    email TEXT
);

CREATE TABLE veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    placa TEXT NOT NULL UNIQUE,
    modelo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    marca TEXT,
    cliente_id INTEGER NOT NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    veiculo_id INTEGER NOT NULL,
    data_agendamento TEXT NOT NULL,  -- formato AAAA-MM-DD
    servico TEXT NOT NULL,
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
);

-- ---------------------------------------------------------
-- Dados iniciais (mínimo de 3 registros por tabela)
-- Logins: felipe/felipe123, felp/felp123, felipe.silva/silva123
-- ---------------------------------------------------------
INSERT INTO usuarios (nome, login, senha) VALUES
('Felipe Silva', 'felipe', '$2b$08$zE61DJNCYzXv8VTvvYnboOseGU1engL5J0l5VfYrc0QqSSxIa.F3e'),
('Felp', 'felp', '$2b$08$1rN4OlF2IJBDg2WO7KLJc.UPTrGR1MxuOmvUC34ImVcho7mpzXTky'),
('Felipe Silva (Recepção)', 'felipe.silva', '$2b$08$.p/9FLljXTjZcmmBK0kzCeuzS3EGhS8POQ3KJnc7Scaf0RwbRTIY2');

INSERT INTO clientes (nome, cpf, telefone, email) VALUES
('Maria Silva', 'bk2tHfj0CRytD8W5:ELwmLLyRcZGrKO7theAkZA==:AfsLozK3ozHtL/0=', '(11) 98888-1111', 'maria.silva@email.com'),
('João Pereira', 'V3OHCWhSBKinKeHS:7E8vWVR2Uk43/1jmy7ws3w==:ZlNsi1IHvYKbEmA=', '(11) 97777-2222', 'joao.pereira@email.com'),
('Fernanda Costa', 'Kj3b+MNlcEx+Pl0l:OU1gCpLscRdxLk2OWjr0ag==:/tbYapADPTz550k=', '(11) 96666-3333', 'fernanda.costa@email.com');

INSERT INTO veiculos (placa, modelo, tipo, marca, cliente_id) VALUES
('ABC1D23', 'Onix', 'Carro', 'Chevrolet', 1),
('DEF4G56', 'CG 160', 'Moto', 'Honda', 2),
('GHI7J89', 'Hilux', 'Utilitário', 'Toyota', 3),
('JKL0M12', 'HB20', 'Carro', 'Hyundai', 1);

-- inseridos fora de ordem de propósito (a listagem ordena por mês)
INSERT INTO agendamentos (veiculo_id, data_agendamento, servico) VALUES
(3, '2026-12-10', 'Revisão completa'),
(2, '2026-10-25', 'Troca de óleo'),
(1, '2026-11-05', 'Alinhamento e balanceamento'),
(4, '2026-11-20', 'Troca de pastilhas de freio');
