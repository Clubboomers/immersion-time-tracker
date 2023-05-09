export class SaveLoader {
  private databaseName: string;
  private objectStoreName: string;
  constructor(databaseName: string, objectStoreName: string) {
    this.databaseName = databaseName;
    this.objectStoreName = objectStoreName;
  }

  async save(jsonString: string): Promise<boolean> {
    const db = await this.openDatabase();
    const transaction = db.transaction(this.objectStoreName, "readwrite");
    const objectStore = transaction.objectStore(this.objectStoreName);
    const data = JSON.parse(jsonString);
    objectStore.put(data);
    await transaction.oncomplete;
    db.close();
    return await this.saveExists();
  }

  async load(): Promise<string | undefined> {
    const db = await this.openDatabase();
    const transaction = db.transaction(this.objectStoreName);
    const objectStore = transaction.objectStore(this.objectStoreName);
    const data = await objectStore.get(1);
    await transaction.oncomplete;
    db.close();
    if (data) {
      return JSON.stringify(data);
    }
    return undefined;
  }

  async openDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onerror = (event) => {
        reject(event);
      };
      request.onsuccess = (event) => {
        resolve(request.result);
      };
      request.onupgradeneeded = (event) => {
        const db = request.result;
        db.createObjectStore(this.objectStoreName);
      };
    });
  }

  async saveExists(): Promise<boolean> {
    const db = await this.openDatabase();
    const transaction = db.transaction(this.objectStoreName);
    const objectStore = transaction.objectStore(this.objectStoreName);
    const data = await objectStore.get(1);
    await transaction.oncomplete;
    db.close();
    if (data) {
      return true;
    }
    return false;
  }
}
