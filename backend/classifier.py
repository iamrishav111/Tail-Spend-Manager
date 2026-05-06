import os
import pickle
import numpy as np
from datetime import datetime
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

class SemanticClassifier:
    def __init__(self, model_name='all-MiniLM-L6-v2', cache_dir=None):
        self.model_name = model_name
        self.cache_dir = cache_dir or os.path.join(os.path.dirname(__file__), '.cache')
        self.model = None
        self.embeddings = None
        self.taxonomy_meta = []
        
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)

    def _load_model(self):
        if self.model is None:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading Semantic Model: {self.model_name}...")
            self.model = SentenceTransformer(self.model_name)

    def fit(self, taxonomy_df, force_recompute=False):
        """
        Precomputes and caches embeddings for the taxonomy.
        """
        cache_path = os.path.join(self.cache_dir, f'taxonomy_embeddings_{self.model_name.replace("/", "_")}.pkl')
        
        if not force_recompute and os.path.exists(cache_path):
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading precomputed taxonomy embeddings...")
            with open(cache_path, 'rb') as f:
                data = pickle.load(f)
                self.embeddings = data['embeddings']
                self.taxonomy_meta = data['meta']
            return

        self._load_model()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Computing embeddings for {len(taxonomy_df)} taxonomy rows...")
        
        corpus_rows = []
        self.taxonomy_meta = []
        
        for _, row in taxonomy_df.iterrows():
            l2 = str(row.get('L2', '')).strip()
            l1 = str(row.get('L1', '')).strip()
            if not l2 or l2.lower() == 'nan': continue
            
            # Contextual text for embedding
            text = ' '.join([
                l2, 
                str(row.get('Description', '')),
                str(row.get('Keywords', ''))
            ]).strip()
            
            corpus_rows.append(text)
            self.taxonomy_meta.append({
                'l1': l1,
                'l2': l2,
                'original_text': text
            })

        if corpus_rows:
            self.embeddings = self.model.encode(corpus_rows, show_progress_bar=False)
            
            with open(cache_path, 'wb') as f:
                pickle.dump({
                    'embeddings': self.embeddings,
                    'meta': self.taxonomy_meta,
                    'model_name': self.model_name,
                    'timestamp': datetime.now().isoformat()
                }, f)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Taxonomy embeddings cached.")

    def predict(self, description, top_n=3, threshold=0.1):
        """
        Predicts top-N categories with confidence scores.
        """
        if self.embeddings is None or not self.taxonomy_meta:
            return []

        self._load_model()
        query_embedding = self.model.encode([description], show_progress_bar=False)
        
        # Calculate cosine similarity
        similarities = cosine_similarity(query_embedding, self.embeddings).flatten()
        
        # Get top-N indices
        top_indices = np.argsort(similarities)[-top_n:][::-1]
        
        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            if score >= threshold:
                meta = self.taxonomy_meta[idx]
                results.append({
                    'l1': meta['l1'],
                    'l2': meta['l2'],
                    'confidence': score,
                    'match_text': meta['original_text']
                })
        
        return results

def get_keyword_fallback(description, taxonomy_df):
    """
    Current fallback logic (keyword + exact match).
    """
    desc_lower = description.lower()
    desc_words = set(desc_lower.split())
    
    best_match = None
    max_overlap = 0
    
    for _, row in taxonomy_df.iterrows():
        l1 = str(row.get('L1', ''))
        l2 = str(row.get('L2', ''))
        if not l2 or l2.lower() == 'nan': continue
        
        # Priority 1: Exact L2 name match in description
        if l2.lower() in desc_lower:
            return [{'l1': l1, 'l2': l2, 'confidence': 1.0, 'method': 'exact_match'}]
        
        # Priority 2: Keyword match
        keywords = str(row.get('Keywords', '')).lower()
        keyword_list = [kw.strip() for kw in keywords.split(',') if kw.strip()]
        if any(kw in desc_lower for kw in keyword_list):
            return [{'l1': l1, 'l2': l2, 'confidence': 0.9, 'method': 'keyword_match'}]
            
        # Priority 3: Contextual overlap
        tax_desc = str(row.get('Description', '')).lower()
        context_words = set(f"{l2} {tax_desc} {keywords}".lower().split())
        overlap = len(desc_words.intersection(context_words))
        
        if overlap > max_overlap:
            max_overlap = overlap
            best_match = {'l1': l1, 'l2': l2, 'confidence': 0.5, 'method': 'context_overlap'}
            
    return [best_match] if best_match else []
