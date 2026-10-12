import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { SavedScenarioList } from '../SavedScenarioList/SavedScenarioList';
import { useScenarioList } from '../../hooks/useScenarioList';
import type { ScenarioModel } from '../../model/Scenario.Model';
import styles from './SelectMapModal.module.css';

interface SelectMapModalProps {
  open: boolean;
  onClose: () => void;
  onCreateBlank: () => void;
  onSelect: (scenario: ScenarioModel) => void;
}

// Passo obrigatório antes do construtor de cenários: escolher um cenário
// salvo (GET /scenarios) ou partir de um mapa em branco.
export function SelectMapModal({ open, onClose, onCreateBlank, onSelect }: SelectMapModalProps) {
  const { scenarios, state, reload } = useScenarioList(open);

  return (
    <Modal open={open} onClose={onClose} title="Abrir construtor de cenários">
      <p className={styles.description}>
        Escolha um cenário salvo ou crie um novo mapa em branco.
      </p>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Mapas salvos</h3>
        <SavedScenarioList scenarios={scenarios} state={state} onSelect={onSelect} onRetry={reload} />
      </section>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Novo mapa</h3>
        <p className={styles.placeholder}>Cria um cenário em branco para editar do zero.</p>
        <Button variant="accent" onClick={onCreateBlank}>
          Criar mapa em branco
        </Button>
      </section>
    </Modal>
  );
}