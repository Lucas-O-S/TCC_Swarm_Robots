import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './SelectVisualizerScenarioModal.module.css';

interface SelectVisualizerScenarioModalProps {
  open: boolean;
  /** Só dá pra fechar sem escolher quando já existe um cenário carregado. */
  closable: boolean;
  onClose: () => void;
  onPickMock: () => void;
}

// Passo inicial do Visualizador — mesmo padrão do SelectTaskMapModal
// (TaskBuilder): o visualizador só usa cenário pronto (nada de em branco nem
// de importar). "Salvos" fica inerte enquanto a API não tem rota de
// cenários, e a única opção que funciona é o mapa mock, sem robôs — eles
// vêm da API.
export function SelectVisualizerScenarioModal({ open, closable, onClose, onPickMock }: SelectVisualizerScenarioModalProps) {
  return (
    <Modal open={open} onClose={onClose} closable={closable} title="Selecionar cenário do visualizador">
      <p className={styles.description}>
        O visualizador não monta nem edita cenário: escolha um pronto (arena e barreiras). Os robôs vêm só da API.
      </p>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Cenários salvos</h3>
        <p className={styles.placeholder}>Nenhum cenário disponível — a API ainda não tem rota de cenários.</p>
        <Button variant="outline" disabled>
          Selecionar cenário
        </Button>
      </section>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Mapa de teste (mock)</h3>
        <p className={styles.placeholder}>
          O mapa fixo do Construtor de Cenários (12×10 blocos, 2 obstáculos), sem robôs — eles aparecem conforme a API
          manda.
        </p>
        <Button variant="accent" onClick={onPickMock}>
          Usar mapa de teste
        </Button>
      </section>
    </Modal>
  );
}
