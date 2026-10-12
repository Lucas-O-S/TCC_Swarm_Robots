import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './SelectReadyMapModal.module.css';

interface SelectReadyMapModalProps {
  open: boolean;
  title: string;
  description: string;
  /** Seção dos salvos no banco (inerte enquanto a conexão não existe). */
  savedTitle: string;
  savedEmptyText: string;
  savedButtonLabel: string;
  /** Texto da opção do mapa de teste (CenarioService.createMockMap). */
  mockText: string;
  onSelectMock: () => void;
  /** Sem `closable`, não dá pra sair sem escolher (sem "×", backdrop nem Esc). */
  closable?: boolean;
  onClose?: () => void;
}

// Escolha de um mapa PRONTO antes de usar a tela (Tarefas, Visualizador):
// os salvos no banco (inerte enquanto a conexão não existe — ver
// CenarioService.createMockMap) ou o mapa de teste fixo, a única opção que
// funciona por enquanto. Cada tela passa os próprios textos.
export function SelectReadyMapModal({
  open,
  title,
  description,
  savedTitle,
  savedEmptyText,
  savedButtonLabel,
  mockText,
  onSelectMock,
  closable = false,
  onClose = () => {},
}: SelectReadyMapModalProps) {
  return (
    <Modal open={open} onClose={onClose} closable={closable} title={title}>
      <p className={styles.description}>{description}</p>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>{savedTitle}</h3>
        <p className={styles.placeholder}>{savedEmptyText}</p>
        <Button variant="outline" disabled>
          {savedButtonLabel}
        </Button>
      </section>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Mapa de teste (mock)</h3>
        <p className={styles.placeholder}>{mockText}</p>
        <Button variant="accent" onClick={onSelectMock}>
          Usar mapa de teste
        </Button>
      </section>
    </Modal>
  );
}
