# 🎸 Guia de Setup Completo - Guitrard

## 📦 Passo 1: Instalação

### Frontend

```bash
cd guitrard
npm install
```

### Backend (Opcional mas Recomendado)

```bash
cd backend
pip install -r requirements.txt
```

## 🎛️ Passo 2: Hardware Setup

### Opção 1: Interface de Áudio USB (Recomendado)

1. **Conecte** sua interface USB ao computador
2. **Plugue** a guitarra na entrada Hi-Z/Instrument da interface
3. **Configure** o driver:
   - **Windows**: ASIO4ALL ou driver nativo
   - **Mac**: Core Audio (automático)
   - **Linux**: ALSA/JACK

4. **Buffer Size**: 64-128 samples para baixa latência

### Opção 2: Entrada de Microfone Integrada

1. **Cabo adaptador** P10 → P2 (1/4" → 3.5mm)
2. **Atenção**: Pode ter latência maior
3. **Volume**: Ajuste o ganho no sistema

## 🚀 Passo 3: Iniciar o Projeto

### Terminal 1 - Frontend

```bash
npm start
```

Aguarde abrir: http://localhost:3000

### Terminal 2 - Backend (Opcional)

```bash
cd backend
python app.py
```

Verifique: http://localhost:5000/api/health

## 🎮 Passo 4: Configuração Inicial no App

1. **Abra** http://localhost:3000
2. **Click** em "🎤 START AUDIO"
3. **Permita** acesso ao microfone quando solicitado
4. **Aguarde** indicador "AUDIO ATIVO"

## 🎸 Passo 5: Primeiro Teste

### Teste de Som Básico

1. **Click** no botão "+"
2. **Escolha** "Clean Amp"
3. **Toque** a guitarra - você deve ouvir o som limpo
4. **Ajuste** o volume no knob "Master"

### Adicionar Efeitos

1. **Click** "+" novamente
2. **Adicione** "Distortion"
3. **Click** no footswitch para ativar
4. **Ajuste** Drive, Tone, Level
5. **Rock!** 🤘

## ⚙️ Configurações Avançadas

### Configurar Latência Ideal

#### Windows

1. Painel de Controle da Interface
2. Buffer Size: 64 ou 128 samples
3. Sample Rate: 48000 Hz

#### Mac

1. Audio MIDI Setup
2. Configure Built-in Output
3. Sample Rate: 48000 Hz

### Configurar MIDI

```bash
# Lista dispositivos MIDI
cd backend
python -c "from midi_controller import MIDIController; m = MIDIController(); print(m.get_available_ports())"

# Edite app.py para conectar seu dispositivo
```

### Configurar OSC (TouchOSC no celular)

1. **Instale** TouchOSC no celular
2. **Configure** IP do computador
3. **Porta**: 8000
4. **Crie** controles:
   - Faders para parâmetros
   - Botões para bypass
   - Botões para presets

## 🎚️ Fluxo de Sinal

```
Guitarra → Interface USB → Navegador (WebAudio) → Efeitos → Output
                                                      ↓
                                                  Pedals Chain
                                                      ↓
                                            Distortion → Delay → Reverb → Amp
```

## 📊 Monitoramento de Performance

### Chrome DevTools

1. **F12** para abrir DevTools
2. **Performance** tab
3. **Record** durante uso
4. Verifique CPU usage

### Otimizar Performance

- Use menos efeitos simultâneos
- Reverb é o mais pesado
- Prefira Chorus/Delay para menor CPU

## 🔊 Dicas de Som

### Para Metal/Rock Pesado

```
Distortion (Drive: 80) → Delay (Mix: 30%) → Amp Metal
```

### Para Clean/Jazz

```
Chorus (Mix: 40%) → Reverb (Mix: 25%) → Amp Clean
```

### Para Solos

```
Distortion (Drive: 60) → Delay (Time: 400ms, Feedback: 45%) → Reverb (Mix: 20%) → Amp Lead
```

## 🐛 Resolução de Problemas Comuns

### "Microfone não detectado"

- Verifique permissões do navegador
- Chrome: chrome://settings/content/microphone
- Firefox: Preferências → Privacidade → Permissões

### "Som com muito ruído"

- Verifique cabos
- Use cabo blindado
- Ative gate na interface (se disponível)

### "Latência muito alta"

- Reduza buffer size
- Use Chrome (melhor WebAudio)
- Feche outras abas/programas
- Considere interface USB

### "Backend não conecta"

```bash
# Teste manual
curl http://localhost:5000/api/health

# Se não funcionar, verifique:
netstat -an | grep 5000  # Porta em uso?
python --version         # Python 3.8+?
pip list | grep Flask    # Flask instalado?
```

## 📱 Setup Mobile (Controle Remoto)

### Android/iOS com TouchOSC

1. **Instale** TouchOSC
2. **Encontre IP** do seu computador:
   - Mac: `ifconfig | grep inet`
   - Windows: `ipconfig`
   - Linux: `ip addr`

3. **Configure** no app:
   - Host: `192.168.x.x` (seu IP)
   - Port (outgoing): `8000`
   - Port (incoming): `9000`

4. **Crie layout** ou use template

## ✅ Checklist de Verificação

- [ ] Node.js instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Backend rodando (opcional)
- [ ] Interface de áudio conectada
- [ ] Guitarra plugada
- [ ] Navegador com permissões de áudio
- [ ] Fones/caixas conectados
- [ ] Volume ajustado
- [ ] App aberto e "AUDIO ATIVO"

## 🎓 Próximos Passos

1. **Experimente** todos os efeitos
2. **Crie** presets para seus sons favoritos
3. **Configure** MIDI/OSC se desejar
4. **Compartilhe** seus presets!
5. **Contribua** com melhorias no GitHub

---

**Divirta-se e bom som! 🎸🔥**

