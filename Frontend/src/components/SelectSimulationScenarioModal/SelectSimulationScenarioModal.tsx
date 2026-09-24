import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './SelectSimulationScenarioModal.module.css';

interface ScenarioOption {
  key: string;
  name: string;
  description: string;
}

interface SelectSimulationScenarioModalProps {
  open: boolean;
  /** Só dá pra fechar sem escolher quando já existe um cenário carregado. */
  closable: boolean;
  onClose: () => void;
  presets: ScenarioOption[];
  onPickPreset: (key: string) => void;
  onBlank: () => void;
  onImportFile: (text: string, fileName: string) => void;
  error?: string | null;
}

// Passo inicial da Simulação — mesmo padrão do SelectMapModal
// (CenarioBuilder) e do SelectTaskMapModal (TaskBuilder): "salvos" fica
// inerte enquanto a conexão com o banco não existe, e as opções que
// funcionam offline vêm embaixo (exemplos do RobotSwarmSimulator, o mapa
// mock, em branco, ou um .json do disco).
export function SelectSimulationScenarioModal({
  open,
  closable,
  onClose,
  presets,
  onPickPreset,
  onBlank,
  onImportFile,
  error,
}: SelectSimulationScenarioModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => onImportFile(text, file.name.replace(/\.json$/i, '')));
    e.target.value = '';
  }

  return (
    <Modal open={open} onClose={onClose} closable={closable} title="Selecionar cenário da simulação">
      <p className={styles.description}>
        A simulação roda 100% no navegador (offline): o gateway e a frota simulados conversam com um backend local enquanto
        a conexão com a API não existe.
      </p>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Cenários salvos</h3>
        <p className={styles.placeholder}>
          Nenhum cenário disponível — a conexão com o banco de dados ainda não foi implementada.
        </p>
        <Button variant="outline" disabled>
          Selecionar cenário
        </Button>
      </section>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Cenários de exemplo</h3>
        <ul className={styles.presetList}>
          {presets.map((p) => (
            <li key={p.key} className={styles.preset}>
              <div>
                <strong className={styles.presetName}>{p.name}</strong>
                <p className={styles.placeholder}>{p.description}</p>
              </div>
              <Button variant="accent" onClick={() => onPickPreset(p.key)}>
                Simular
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.option}>
        <h3 className={styles.optionTitle}>Montar do zero ou importar</h3>
        <p className={styles.placeholder}>
          Em branco abre o modo Editar (barreiras, robôs e rotas). O .json usa o mesmo formato do RobotSwarmSimulator.
        </p>
        <div className={styles.actions}>
          <Button variant="outline" onClick={onBlank}>
            Cenário em branco
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Importar .json
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className={styles.hidden} onChange={handleFile} />
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </section>
    </Modal>
  );
}
