import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './SelectTaskMapModal.module.css';

interface SelectTaskMapModalProps {
  open: boolean;
  onSelectMock: () => void;
}

// Passo obrigatório antes do construtor de tasks: a rota é desenhada em
// cima de um mapa (tamanho do grid + obstáculos a evitar), então precisa de
// um selecionado. Sem `onClose` de propósito — banco de mapas ainda não
// existe (ver CenarioService.createMockMap), então a única saída daqui é o
// mock; não dá pra fechar sem escolher nada (mesmo espírito do
// SelectMapModal do CenarioBuilder, mas sem opção de sair vazio).
export function SelectTaskMapModal({ open, onSelectMock }: SelectTaskMapModalProps) {
  return (
    <Modal open={open} onClose={() => {}} title="Selecionar mapa da task">
      <p className={styles.description}>
        A rota é desenhada em cima de um mapa (tamanho do grid e obstáculos a evitar) — selecione um antes de continuar.
      </p>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Mapas salvos</h3>
        <p className={styles.placeholder}>
          Nenhum mapa disponível — a conexão com o banco de dados ainda não foi implementada.
        </p>
        <Button variant="outline" disabled>
          Selecionar mapa
        </Button>
      </section>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Mapa de teste (mock)</h3>
        <p className={styles.placeholder}>
          Sem conexão com o banco ainda — use um mapa fixo (com alguns obstáculos de exemplo) pra testar a tela.
        </p>
        <Button variant="accent" onClick={onSelectMock}>
          Usar mapa de teste
        </Button>
      </section>
    </Modal>
  );
}
