# RigMaster Backend

Backend Python para controle de presets e integração MIDI/OSC.

## Instalação

```bash
cd backend
pip install -r requirements.txt
```

## Executar o servidor

```bash
python app.py
```

O servidor estará disponível em: `http://localhost:5000`

## Endpoints da API

### Health Check
- `GET /api/health` - Verifica se o servidor está rodando

### Presets
- `GET /api/presets` - Lista todos os presets
- `POST /api/presets` - Cria um novo preset
- `GET /api/presets/{id}` - Obtém um preset específico
- `PUT /api/presets/{id}` - Atualiza um preset
- `DELETE /api/presets/{id}` - Deleta um preset

### MIDI
- `GET /api/midi/devices` - Lista dispositivos MIDI disponíveis

### OSC
- `GET /api/osc/config` - Obtém configuração OSC

## Controle MIDI

O backend suporta controle via MIDI. Mapeamento padrão:
- CC 64 (Sustain) = Bypass do efeito atual
- CC 71-74 = Controles de efeitos
- CC 91-93 = Reverb/Delay

## Controle OSC

Você pode controlar os efeitos via OSC (ideal para apps mobile como TouchOSC):

### Exemplos de mensagens OSC:
```
/effect/distortion-1/bypass 1
/effect/delay-1/param/time 500
/effect/reverb-1/param/mix 0.5
/preset/load 3
/master/volume 0.8
```

### Porta padrão: 8000

## Integração com o Frontend

O frontend React se conecta automaticamente ao backend em `http://localhost:5000`.

Para usar presets, basta salvar no frontend e eles serão armazenados no backend.

