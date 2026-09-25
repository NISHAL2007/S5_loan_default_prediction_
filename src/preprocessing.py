import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

def get_feature_types(df, target_col='target'):
    """
    Identifies numerical and categorical features in the dataset.
    """
    features = [c for c in df.columns if c != target_col]
    num_cols = df[features].select_dtypes(include=['int64', 'float64']).columns.tolist()
    cat_cols = df[features].select_dtypes(include=['object', 'category']).columns.tolist()
    return num_cols, cat_cols

def build_preprocessing_pipeline(num_cols, cat_cols):
    """
    Creates a scikit-learn ColumnTransformer pipeline for preprocessing.
    - Numerical: Median Imputer + StandardScaler
    - Categorical: Most Frequent Imputer + OneHotEncoder (handle_unknown='ignore')
    
    Fits strictly on training data to prevent data leakage.
    """
    num_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    cat_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', num_pipeline, num_cols),
            ('cat', cat_pipeline, cat_cols)
        ]
    )
    
    return preprocessor

def prepare_data(data_path='data/german_credit.csv', target_col='target', test_size=0.2, random_state=42):
    """
    Loads data, splits into train and test sets using Stratified Split, 
    and fits preprocessor ONLY on the training split.
    """
    df = pd.read_csv(data_path)
    X = df.drop(columns=[target_col])
    y = df[target_col]
    
    # Class Imbalance Check:
    # Target distribution is ~70% Non-default (0) vs ~30% Default (1).
    # Since the minority class (30%) is above the extreme threshold (<20%), 
    # synthetic oversampling (SMOTE) is optional and class_weight='balanced' can be used instead 
    # to avoid introducing noisy synthetic samples.
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=random_state
    )
    
    num_cols, cat_cols = get_feature_types(df, target_col)
    preprocessor = build_preprocessing_pipeline(num_cols, cat_cols)
    
    # Fit preprocessor ONLY on train split (Prevent Data Leakage)
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    
    # Extract feature names after OneHotEncoding for SHAP and explainability
    cat_encoder = preprocessor.named_transformers_['cat'].named_steps['encoder']
    cat_feature_names = cat_encoder.get_feature_names_out(cat_cols).tolist()
    feature_names = num_cols + cat_feature_names
    
    return {
        'X_train_raw': X_train,
        'X_test_raw': X_test,
        'X_train': X_train_trans,
        'X_test': X_test_trans,
        'y_train': y_train,
        'y_test': y_test,
        'preprocessor': preprocessor,
        'feature_names': feature_names,
        'num_cols': num_cols,
        'cat_cols': cat_cols
    }

if __name__ == '__main__':
    data_dict = prepare_data()
    print("Preprocessing completed successfully!")
    print("X_train shape:", data_dict['X_train'].shape)
    print("X_test shape:", data_dict['X_test'].shape)
    print("Total engineered features:", len(data_dict['feature_names']))
