import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './SelectMapModal.module.css';

interface SelectMapModalProps {
  open: boolean;
  onClose: () => void;
  onCreateBlank: () => void;
}

// Passo obrigatório antes do construtor de cenários: escolher um mapa salvo
// (banco ainda não existe, opção fica inerte) ou partir de um mapa em branco.
export function SelectMapModal({ open, onClose, onCreateBlank }: SelectMapModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Abrir construtor de cenários">
      <p className={styles.description}>
        Escolha um mapa salvo no banco de dados ou crie um novo mapa em branco.
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
        <h3 className={styles.optionTitle}>Novo mapa</h3>
        <p className={styles.placeholder}>Cria um cenário em branco para editar do zero.</p>
        <Button variant="accent" onClick={onCreateBlank}>
          Criar mapa em branco
        </Button>
      </section>
    </Modal>
  );
}
