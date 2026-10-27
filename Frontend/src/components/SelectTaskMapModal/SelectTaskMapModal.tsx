import { Modal } from '../Modal/Modal';
import { SavedScenarioList } from '../SavedScenarioList/SavedScenarioList';
import { useScenarioList } from '../../hooks/useScenarioList';
import type { ScenarioModel } from '../../model/Scenario.Model';
import styles from './SelectTaskMapModal.module.css';

interface SelectTaskMapModalProps {
  open: boolean;
  onSelect: (scenario: ScenarioModel) => void;
}

// Passo obrigatório antes do construtor de tasks: a rota é desenhada em
// cima de um cenário salvo (tamanho do grid + obstáculos a evitar), então
// precisa de um selecionado. `closable={false}` esconde o "×"/ignora
// backdrop/Esc — não dá pra fechar sem escolher.
export function SelectTaskMapModal({ open, onSelect }: SelectTaskMapModalProps) {
  const { scenarios, state, reload } = useScenarioList(open);

  return (
    <Modal open={open} onClose={() => {}} closable={false} title="Selecionar mapa da task">
      <p className={styles.description}>
        A rota é desenhada em cima de um mapa (tamanho do grid e obstáculos a evitar) — selecione um antes de continuar.
      </p>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Mapas salvos</h3>
        <SavedScenarioList
          scenarios={scenarios}
          state={state}
          onSelect={onSelect}
          onRetry={reload}
          emptyMessage="Nenhum cenário salvo ainda — crie um no Construtor de Cenários primeiro."
        />
      </section>
    </Modal>
  );
}